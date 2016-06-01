"use strict";

if (!process.env.token){
    console.log('Error: Specify token for environment');
};

const Botkit = require('botkit');
const os = require('os');
const moment = require('moment');
const db = require('./db/db');
 
const controller = Botkit.slackbot({
   debug: false
});

var bot = controller.spawn({
   token: process.env.token 
}).startRTM();

// create lean talk with agenda
controller.hears(['create new for (.*) with agenda (.*)'],'direct_message,direct_mention,mention', function(bot, message) {
    let date = message.match[1].trim();
    let agenda = message.match[2].trim();
    if(!containsWhiteSpace(agenda))
        return bot.reply(message, "That seems kind of short, try again and add some more details");
    if(!validDate(date))
        return bot.reply(message,"That's not a valid date, reformat to 12/12/2099");
    if(agenda.length > 140)
        return bot.reply(message,"That's a long agenda, please shorten it.");
    // check if agenda already exists
    
    var event = 
    {
        agenda:agenda,
        user:message.user,
        type: 'agenda',
        date: moment().format(date),
    };
    db.insert(event, function (err, newDoc) {
           if(err)
                return bot.reply(message, 'uh Oh something went wrong.');
           return bot.reply(message, 'Created lean coffee with id: ${newDoc._i} with agenda ${newDoc.agenda} for: ${newDoc.date}');
    });
});

// add topic for lean coffee
controller.hears(['for agenda (.*) add new topic (.*)'],'direct_message,direct_mention,mention', function(bot, message) {
    let agendaId = message.match[1].trim();
    let topic = message.match[2].trim();
    
    if(topic.length > 140)
        return bot.reply(message,"That's a long topic, please shorten it.");
        
    if(!containsWhiteSpace(topic))
        return bot.reply(message, "That seems kind of short, try again and add some more details");
        
    let newTopic = 
    {   agendaId:agendaId,
        topic: topic,
        user: message.user,
        type: 'topic',
        votes: []
    };
    db.insert(newTopic, function (err, topic) {
        if(err)
                return bot.reply(message, 'uh Oh something went wrong.');
        return bot.reply(message, 'Created lean coffee topic with id: ' + topic._id 
        + ' for agenda '+ topic.agendaId);
    });  
});

// vote for ideas for lean talk
controller.hears(['for agenda (.*) vote for topic (.*)'],'direct_message,direct_mention,mention', function(bot, message) {
    let agendaId = message.match[1].trim();
    let topicId = message.match[2].trim();

    db.find({agendaId:agendaId}, function(err, docs){
        var count = 0;
        docs.map(function(topic){
           topic.votes.map(function(vote){
               if(vote === message.user)
                    count++;
           }); 
        });
        if(count > 3)
            return bot.reply(message, 'You have voted too many times for this agenda, Bryan Joseph');
        db.findOne({_id:topicId}, function (err, doc) {
            if(doc.agendaId !== agendaId)
                return bot.reply(message, 'agenda not found and topic not found');
            db.update({ _id: doc._id }, { $addToSet: { votes: message.user } }, {}, function (err, result) {
            if(err)
                    return bot.reply(message, 'uh Oh something went wrong.');
            if(result == 1)
                    return bot.reply(message, 'Voted!');
            });
        });
    });
});

// list all agendas 
controller.hears(['list all agendas'],'direct_message,direct_mention,mention', function(bot, message) {
    var things = [];
    db.find({ type: 'agenda' }, function (err, docs) {
        // should filter the docs instead, to make less shitty.
        // docs.forEach(function(doc){
        //    var result = moment(doc.date).isAfter(moment());
        //    if(moment(doc.date).isAfter(moment()))
        //     return bot.reply(message, doc.agenda); 
        //    else {
        //        return bot.reply(message, 'there is no current agendas for lean coffee');
        //    }
        // });
        things = docs;
    });
    console.log(things);
});

controller.hears(['list all topics for agenda (.*)'], 'direct_message,direct_mention,mention', function(bot, message){
    let agenda = message.match[1].trim();
    db.find({agendaId:agenda}, function(err, topics) {
        topics.forEach(function(topic){
           return bot.reply(message, topic.topic); 
        }); 
    });
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
        let hostname = os.hostname();
        let uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + '.');
    });

controller.hears([''], 'direct_message','direct_mention','mention', function(bot, message){
        var helpText = [
        "Lean bot commands and responses",
        '```',
        '"create new for {date} with agenda {agenda}" - Creates new agenda for a given date.  - returns id, agenda, and date',
        '"for agenda {agenda || agendaId} add new topic {topic}" - Adds new topic for given agenda - return id, topic, and agendaId',
        '"for {agenda || agendaId} vote for topic {topic || topicId}" - returns voted!',
        '"list all agendas" - Lists all available agendas - returns agendas',
        '"list all topics for agenda {agenda || agendaId}" - Lists all topics for agenda - returns topics for agenda',
        '"uptime" - How long has the bot been up',
        '"shutdown" - shutdowns lean bot',
        '```'
      ];

      bot.reply(message, helpText.join('\n'));
});

function formatUptime(uptime) {
    let unit = 'second';
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
    let formats = [moment.ISO_8601, "MM/DD/YYYY"];
    return moment(date, formats, true).isValid();
}

function sortByDate(unsorted) {
   return unsorted.sort(function(a,b){
        return new Date(b.date) - new Date(a.date);
    });
}

function containsWhiteSpace(str){
    if (/\s/.test(str)) {
        return true;
    }
    return false;
}