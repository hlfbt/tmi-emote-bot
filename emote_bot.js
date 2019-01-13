#!/usr/bin/env node

const tmi = require('tmi.js');
const log = require('./log.js');
const config = require('./config.js');

var lastPost = {};
for (channel of config.tmi_opts.channels) {
  lastPost['#' + channel] = Date.now();
}

const postEmote = function (channel, prefix) {
    let msg = config.bot_opts.emote;

    if (prefix && typeof prefix === 'string' && prefix.length > 0) {
        msg = `${prefix.trim()} ${msg}`;
    }

    lastPost[channel] = Date.now();
    client.say(channel, msg);

    log.logger.info(`Emote posted to ${channel} with prefix '${prefix}'`);
};

const getNextAutoPost = function (channel) {
    return lastPost[channel]
               + (config.bot_opts.autoPostDelay
                     + Math.floor(Math.random() * config.bot_opts.autoPostRngDelay)
                     - (config.bot_opts.autoPostRngDelay / 2));
};
const autoPostLoop = function (channel) {
    if (!config.bot_opts.autoPost) {
        return;
    }

    if (Date.now() >= getNextAutoPost(channel)) {
        postEmote(channel);
    }

    let timeout = getNextAutoPost(channel) - Date.now() + 10;
    setTimeout(autoPostLoop.bind(this, channel), timeout);

    log.logger.info(`Auto post sheduled for ${channel} in ${timeout}ms`);
};


const client = new tmi.client(config.tmi_opts);

client.on('connected', onConnectedHandler);
client.on('notice', onNoticeHandler);
client.on('message', onMessageHandler);
if (config.bot_opts.greetSubs) {
    client.on('subscription', onSubHandler);
    client.on('resub', onSubHandler);
}

client.connect();


const mentionRegex = new RegExp(`(?:^|[\\b@])${config.tmi_opts.identity.username.toLowerCase()}(?:\\b|$)`);
const containsMention = function (msg) {
    return !!msg
               .trim()
               .toLowerCase()
               .match(mentionRegex);
};

const getUserFromState = function (userstate, fallback) {
    log.event.debug('[method] getUserFromState', userstate, fallback);
    if (typeof userstate === 'object'
            && 'display-name' in userstate
            && userstate['display-name']) {
        return '@' + userstate['display-name'];
    }

    if (fallback) {
        return '@' + fallback.trim().trim('#');
    }

    return '';
}

function onMessageHandler(channel, userstate, msg, self) {
    log.event.info('[message]', channel, msg, self, userstate);

    if (self) {
        return;
    }

    if (userstate["message-type"] !== "chat") {
        return;
    }

    if (config.bot_opts.replyMentions && containsMention(msg)) {
        postEmote(channel, getUserFromState(userstate, userstate['username']));
    }
}

function onSubHandler(channel, username, months, msg, userstate, method) {
    let resub = typeof months === "number";

    log.event.info(resub ? '[resub]' : '[subscription]', channel, username, msg, months, userstate);

    if (username.toLowerCase() === config.tmi_opts.identity.username.toLowerCase()) {
        return;
    }

    let prefix = '';
    if (resub) {
        prefix = config.bot_opts.emote + ' ';
        prefix = prefix.repeat(months - 1).trim();
    } else if (typeof months === "object") {
        userstate = months;
    }

    username = getUserFromState(userstate, username);

    postEmote(channel, `${username} ${prefix}`);
}

function onConnectedHandler(addr, port) {
    log.event.info('connected to twitch', addr, port);
    log.logger.info(`Connected to ${addr}:${port}`);

    for (channel of config.tmi_opts.channels) {
        autoPostLoop(channel);
    }
}

function onNoticeHandler(channel, msgid, message) {
    log.event.debug(`[notice] ${msgid}`, ...arguments);
}
