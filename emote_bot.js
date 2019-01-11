#!/usr/bin/env node

const tmi = require('tmi.js');
const config = require('./config.js');

console.log(config);

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

    console.log('* Emote posted', channel, prefix);
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

    setTimeout(autoPostLoop.bind(this, channel), getNextAutoPost(channel) - Date.now() + 10);

    console.log('* Auto post sheduled', channel, getNextAutoPost(channel) - Date.now() + 10);
};


const client = new tmi.client(config.tmi_opts);

client.on('message', onMessageHandler);
client.on('subscription', onSubHandler);
client.on('resub', onSubHandler);
client.on('connected', onConnectedHandler);

client.connect();


const mentionRegex = new RegExp(`(?:^|[\\b@])${config.tmi_opts.identity.username.toLowerCase()}(?:\\b|$)`);
const containsMention = function (msg) {
    return !!msg
               .trim()
               .toLowerCase()
               .match(mentionRegex);
};

const getUserFromState = function (userstate, fallback) {
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
    //console.log('* Message received', channel, msg, self, userstate);

    if (self) {
        return;
    }

    if (userstate["message-type"] !== "chat") {
        return;
    }

    if (containsMention(msg)) {
        postEmote(channel, getUserFromState(userstate, userstate['username']));
    }
}

function onSubHandler(channel, username, months, msg, userstate, method) {
    console.log('* Subscription', channel, username, msg, months, userstate);

    if (username.toLowerCase() === config.tmi_opts.identity.username.toLowerCase()) {
        return;
    }

    let prefix = '';
    if (typeof months === "number") {
        prefix = config.bot_opts.emote + ' ';
        prefix = prefix.repeat(months - 1).trim();
    } else if (typeof months === "object") {
        userstate = months;
    }

    username = getUserFromState(userstate, username);

    postEmote(channel, `${username} ${prefix}`);
}

function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);

    for (channel of config.tmi_opts.channels) {
        autoPostLoop(channel);
    }
}
