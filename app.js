'use strict';

if (!process.env.token){
    console.log('Error: Specify token for environment');
}

const Botkit = require('botkit');

const controller = Botkit.slackbot({
   debug: false 
});

var bot = controller.spawn({
   token: process.env.token 
}).startRTM();

// create lean talk
controller.hears(['create new lean event (.*)', 'create new lean topic (.*)'],'direct_message,direct_mention,mention', function(bot, message) 
    let topic = message.match[1];
});

// add ideas to lean talk
controller.hears(['for (.*) add new idea (.*)'],'direct_message,direct_mention,mention', function(bot, message) {
    
});

// vote for ideas for lean talk
// {id:,title:, votes:[{name:}, {name:}}
controller.hears(['add vote for (.*)'],'direct_message,direct_mention,mention', function(bot, message) {
    
});

//shutdown
controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.startConversation(message, function(err, convo) {

        convo.ask('Are you sure you want me to shutdown?', [
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Bye!');
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    }, 3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say('Okay, not shutting down');
                convo.next();
                }
            }
        ]);
    });
});