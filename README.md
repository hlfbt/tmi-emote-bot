![missde5Sup](https://static-cdn.jtvnw.net/emoticons/v1/1750968/3.0 "missde5Sup")


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


## TODOs

* ![missde5Sup](https://static-cdn.jtvnw.net/emoticons/v1/1750968/1.0 "missde5Sup")
* only post automatically if the channel is live
* the autopost code is probably crap
* actually most of the code is crap
