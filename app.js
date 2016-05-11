'use strict';

if (!process.env.token){
        // for debugging process.env.token = ;
    console.log('Error: Specify token for environment');
}

const Botkit = require('botkit');
const os = require('os');
const moment = require('moment');
const db = require('./db/db')
 
const controller = Botkit.slackbot({
   debug: false
});

var bot = controller.spawn({
   token: process.env.token 
}).startRTM();

// create lean talk with agenda
controller.hears(['create lean coffee on (.*) with agenda (.*)'],'direct_message,direct_mention,mention', function(bot, message) {
    let date = message.match[1];
    let agenda = message.match[2];
    if(!validDate(date))
        return bot.reply(message,"That's not a valid date, reformat to 12/12/2099");
    if(agenda.length > 140)
        return bot.reply(message,"That's a long agenda, please shorten it.")
    var event = 
    {
        agenda:agenda,
        topics:[],
        date: moment().format(date),
    };
    db.insert(event, function (err, newDoc) {
           if(err)
                return bot.reply(message, 'uh Oh something went wrong.');
           return bot.reply(message, 'Created lean coffee with id: ' + newDoc._id 
           + 'with agenda '+ newDoc.agenda 
           + ' for: ' + newDoc.date);
    });
});

// add topic for lean coffee
controller.hears(['for (.*) add new idea (.*)'],'direct_message,direct_mention,mention', function(bot, message) {
    let id = message.match[1];
    let topic = message.match[2];
    
    if(!validDate(date))
        return bot.reply(message,"That's not a valid date, reformat to 12/12/2099");
    if(topic.length > 140)
        return bot.reply(message,"That's a long topic, please shorten it.")
        
    //need to get the agenda by id or agenda ?     
    var agenda = db.find({_id:id});    
    var newTopic = 
    {
        topic: topic,
        user: message.user,
        votes: []
    };
    agenda.topics.push(newTopic);
    db.update(newTopic);
});

// vote for ideas for lean talk
controller.hears(['vote for (.*)'],'direct_message,direct_mention,mention', function(bot, message) {
    
});

// list all current topics 
controller.hears(['list all agendas'],'direct_message,direct_mention,mention', function(bot, message) {
    db.find({}, function (err, docs) {
        console.log(docs);
    });
});

controller.hears(['list all topics for agenda (.*)'], 'direct_message,direct_mention,mention', function(bot, message){
    
});

//shutdown
controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function(bot, message) {
    console.log('heard it');
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


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function(bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + '.');

    });


function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}

function validDate(date)
{
    var formats = [moment.ISO_8601, "MM/DD/YYYY"];
    return moment(date, formats, true).isValid();
}