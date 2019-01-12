const { createLogger, format, transports } = require('winston');
const { combine, timestamp, cli, label, splat, json, prettyPrint, simple, printf } = format;
const { File, Console } = transports;

let loggers = module.exports = {};

const getLabeledJsonFormat = function (labelName) {
    return combine(timestamp(), splat(), label({ label: labelName }), json());
};

loggers.logger = createLogger({
    level: 'debug',
    transports: [
        new Console({
            colorize: true,
    format: combine(
        cli(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        splat(),
        prettyPrint(),
        simple(),
        printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
        }),
        new File({
            filename: 'bot.log',
            format: combine(timestamp(), splat(), json())
        })
    ]
});

const eventLogger = createLogger({
    level: 'debug',
    format: getLabeledJsonFormat('event'),
    transports: [
        new File({ filename: 'events.log' })
    ]
});

loggers.event = eventLogger;

// Child loggers are in the master branch but not yet published on npm :<
//loggers.event = {
//    default: eventLogger,
//    messages: eventLogger.child({ format: getLabeledJsonFormat('message') }),
//    methods: eventLogger.child({ format: getLabeledJsonFormat('method') }),
//    subscriptions: eventLogger.child({ format: getLabeledJsonFormat('subscription') })
//};
