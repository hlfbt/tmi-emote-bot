#!/usr/bin/env node

const path = require('path');
const tmi = require('tmi.js');
const log = require('./log.js');

let configLocation = '';
let nextIsConfig = false;
for (let arg of process.argv) {
    if (nextIsConfig) {
        configLocation = arg;
        break;
    }
    if (arg === '-c' || arg === '--config') {
        nextIsConfig = true;
    }
    if (arg.indexOf('--config=') === 0) {
        configLocation = arg.match(/^--config=(.*)$/)[1];
        break;
    }
}
if (!configLocation) {
    configLocation = './config.js';
}

const config = require(path.resolve(configLocation));

const client = new tmi.client(config.tmi_opts);


var channelStatus = {};
for (let channel of config.tmi_opts.channels) {
    channelStatus[channel.toLowerCase()] = {
        lastPost: Date.now(),
        nextPost: 0,
        live: false
    };
}

const postEmote = function (channel, prefix) {
    let message = config.bot_opts.emote;

    if (prefix && typeof prefix === 'string' && prefix.length > 0) {
        message = `${prefix.trim()} ${message}`;
    }

    channelStatus[channel].lastPost = Date.now();
    client.say(channel, message);

    log.logger.info(`Emote posted to ${channel} with prefix '${prefix}'`);
};

const getNextAutoPost = function (channel) {
    if (!channelStatus[channel].lastPost) {
        channelStatus[channel].lastPost = Date.now();
    }

    if (channelStatus[channel].nextPost < channelStatus[channel].lastPost) {
        channelStatus[channel].nextPost = channelStatus[channel].lastPost
            + (config.bot_opts.autoPostDelay
                + Math.floor(Math.random() * config.bot_opts.autoPostRngDelay)
                - (config.bot_opts.autoPostRngDelay / 2));
    }

    return channelStatus[channel].nextPost;
};

const autoPostLoop = function (channel) {
    if (!config.bot_opts.autoPost) {
        return;
    }

    if (!channelStatus[channel].live) {
        return;
    }

    if (Date.now() >= getNextAutoPost(channel)) {
        postEmote(channel);
    }

    let timeout = getNextAutoPost(channel) - Date.now() + 10;
    setTimeout(autoPostLoop.bind(this, channel), timeout);

    log.logger.info(`Auto post scheduled for ${channel} in ${timeout}ms`);
};

const containsMention = function (message) {
    const mentionRegex = new RegExp(`(?:^|[\\b@])${config.tmi_opts.identity.username.toLowerCase()}(?:\\b|$)`);

    return !!message
               .trim()
               .toLowerCase()
               .match(mentionRegex);
};

const getUserFromState = function (userstate, fallback) {
    log.event.debug('getUserFromState', {
        label: 'method',
        arguments: {
            userstate: userstate,
            fallback: fallback
        }
    });

    if (typeof userstate === 'object'
            && userstate != null
            && 'display-name' in userstate
            && userstate['display-name']) {
        return '@' + userstate['display-name'];
    }

    if (fallback) {
        return '@' + fallback.trim().trim('#');
    }

    return '';
};

const getChannelInfo = function (channel, callback) {
    client.api({
        url: `https://api.twitch.tv/helix/streams?user_login=${channel.replace(/^#/, '')}`,
        method: "GET",
        headers: {
            "Authorization": 'Bearer ' + config.tmi_opts.identity.password.replace(/^oauth:/, '')
        }
    }, function (err, res, body) {
        try {
            body = JSON.parse(body);
        } catch (e) {}

        log.event.debug('retrieved channel info', {
            label: 'channelInfo',
            data: {
                err: err,
                res: res,
                body: body
            }
        });

        callback.call(this, err, res, body);
    });
};

const liveCheckLoop = function (channel, err, res, body) {
    if (!config.bot_opts.autoPost) {
        return;
    }

    if (typeof body !== 'object' || !('data' in body)) {
        getChannelInfo(channel, liveCheckLoop.bind(this, channel));

        return;
    }

    let oldLiveStatus = channelStatus[channel].live;
    // Twitch API returns an empty array if the stream is not live,
    // there isn't really a nicer (official) way of checking live status either which is DUMB
    // Maybe I should just use the official but undocumented GraphQL API instead 😔
    channelStatus[channel].live = (body.data[0] || { type: '' }).type.toLowerCase() === 'live';

    if (oldLiveStatus !== channelStatus[channel].live) {
        log.event.info(`channel ${channel} went ${oldLiveStatus ? 'offline' : 'live'}`, {
            label: 'channelStatus',
            data: channelStatus[channel]
        });
        log.logger.info(`Channel ${channel} went ${oldLiveStatus ? 'OFFLINE' : 'LIVE'}`);
    }

    let timeout = config.bot_opts.autoPostDelay - (config.bot_opts.autoPostRngDelay / 2);
    setTimeout(liveCheckLoop.bind(this, channel), timeout);
};


function onMessageHandler(channel, userstate, message, self) {
    log.event.info(`message received in ${channel}`, {
        label: 'message',
        arguments: {
            channel: channel,
            userstate: userstate,
            message: message,
            self: self
        }
    });

    if (self) {
        return;
    }

    if (userstate["message-type"] !== "chat") {
        return;
    }

    if (config.bot_opts.replyMentions && containsMention(message)) {
        postEmote(channel, getUserFromState(userstate, userstate['username']));
    }
}

function onResubHandler(channel, username, months, message, userstate, methods) {
    log.event.info(`resub in ${channel} by ${username} for ${months} months`, {
        label: 'resub',
        arguments: {
            channel: channel,
            username: username,
            months: months,
            message: message,
            userstate: userstate,
            methods: methods
        }
    });

    if (username.toLowerCase() === config.tmi_opts.identity.username.toLowerCase()) {
        return;
    }

    let emoteRepeat = config.bot_opts.emote + ' ';
    emoteRepeat = emoteRepeat.repeat(months - 1).trim();
    username = getUserFromState(userstate, username);

    postEmote(channel, `${username} ${emoteRepeat}`);
}

function onSubHandler(channel, username, methods, message, userstate) {
    log.event.info(`subscription in ${channel} by ${username}`, {
        label: 'subscription',
        arguments: {
            channel: channel,
            username: username,
            methods: methods,
            message: message,
            userstate: userstate
        }
    });

    if (username.toLowerCase() === config.tmi_opts.identity.username.toLowerCase()) {
        return;
    }

    username = getUserFromState(userstate, username);

    postEmote(channel, username);
}

function onConnectedHandler(addr, port) {
    log.event.info('connected to twitch', {
        arguments: {
            addr: addr,
            port: port
        }
    });
    log.logger.info(`Connected to ${addr}:${port}`);

    for (let channel of config.tmi_opts.channels) {
        liveCheckLoop(channel);
        setTimeout(autoPostLoop.bind(this, channel), 500);
    }
}

function onNoticeHandler(channel, msgid, message) {
    log.event.debug(`notice received: ${msgid}`, {
        label: 'notice',
        arguments: {
            channel: channel,
            msgid: msgid,
            message: message
        }
    });
}


log.logger.info(`Starting ${config.tmi_opts.identity.username} bot with config %o`, {
    config: config.bot_opts
});

client.on('connected', onConnectedHandler);
client.on('notice', onNoticeHandler);
client.on('message', onMessageHandler);
if (config.bot_opts.greetSubs) {
    client.on('subscription', onSubHandler);
    client.on('resub', onResubHandler);
}

client.connect();
