![missde5Sup][missde5Sup3]


## Wat it do

The bot only posts the one emote it is configured for.
It replies to any mentions with the emote. It also greets all subs with the amount of months they (re)subbed!
The bot can also periodically post the emote automatically.

The bot uses [tmi.js][tmijs] to interface with twitch.


## Installation

Simply run
```shell
npm install
```
to install all required NPM packages.


## Running

To start the bot, just start the script with node
```shell
node emote_bot.js
```


## Configuration

Copy `config.js.dist` to `config.js` and set values accordingly.

`config.tmi_opts`:

* `identity.username`: your twitch username / the bots twitch username
* `identity.password`: the oauth token for authorization


`config.bot_opts`:

* `emote`: the emote to post (f.i. VoHiYo)
* `autoPost`: whether to automatically periodically post the emote to all connected channels
* `autoPostDelay`: the automatic posting interval delay in milliseconds
* `autoPostRngDelay`: set to greater than 0 if the periodic interval delay should further be delayed by a random range of +/- `autoPostRngDelay / 2`
* `greetSubs`: whether to greet (re-) subscriptions with as many emotes as months that they subscribed
* `replyMentions`: whether to reply to any mentions with the emote


## TODOs

* ![missde5Sup][missde5sup1]
* only post automatically if the channel is live
* the autopost code is probably crap
* actually most of the code is crap
* make bot config channel dependent with global defaults


[missde5sup3]: https://static-cdn.jtvnw.net/emoticons/v1/1750968/3.0 "Check out MissDeerFace on Twitch.tv!"
[missde5sup1]: https://static-cdn.jtvnw.net/emoticons/v1/1750968/1.0 "Check out MissDeerFace on Twitch.tv!"
[tmijs]: https://docs.tmijs.org/
