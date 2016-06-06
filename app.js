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

let bot = controller.spawn({
   token: process.env.token 
}).startRTM();

// create lean talk with agenda
controller.hears('for (.*) create new agenda (.*)',['direct_message,direct_mention,mention'], function(bot, message) {
    let date = message.match[1].trim();
    let agenda = message.match[2].trim();
    if(!containsWhiteSpace(agenda))
        return bot.reply(message, "That seems kind of short, try again and add some more details");
    if(!validDate(date))
        return bot.reply(message,"That's not a valid date, reformat to 12/12/2099");
    if(agenda.length > 140)
        return bot.reply(message,"That's a long agenda, please shorten it.");
    
    let event = 
    {
        agenda:agenda,
        user:message.user,
        channel:message.channel,
        type: 'agenda',
        date: moment().format(date),
    };
    
   db.find({ type: 'agenda', agenda:agenda }, function (err, docs) {
      if(docs.length > 0)
        return bot.reply(message, 'Agenda already exists, try a new one.');
      else {
          db.insert(event, function (err, newDoc) {
           if(err)
                return bot.reply(message, 'uh Oh something went wrong.');
            });    
            return bot.reply(message, `Created lean coffee with id: ${newDoc._id} with agenda ${newDoc.agenda} for: ${newDoc.date}`);
        } 
   });
});

// add topic for lean coffee
controller.hears('for agenda (.*) add new topic (.*)',['direct_message,direct_mention,mention'], function(bot, message) {
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
        return bot.reply(message, `Created lean coffee topic with id: ${topic._id} for agenda ${topic.agendaId}`);
    });  
});

// vote for ideas for lean talk
controller.hears('for agenda (.*) vote for topic (.*)',['direct_message,direct_mention,mention'], function(bot, message) {
    let agendaId = message.match[1].trim();
    let topicId = message.match[2].trim();

    db.find({agendaId:agendaId}, function(err, docs){
        let count = 0;
        docs.map(function(topic){
           topic.votes.map(function(vote){
               if(vote === message.user)
                    count++;
           }); 
        });
        if(count > 3)
            return bot.reply(message, 'You have voted too many times for this agenda');
        db.findOne({_id:topicId}, function (err, doc) {
            if(doc.agendaId !== agendaId)
                return bot.reply(message, 'agendas not found and topic not found');
            db.update({ _id: doc._id }, { $addToSet: { votes: message.user } }, {}, function (err, result) {
            if(err)
                    return bot.reply(message, 'Uh Oh something went wrong.');
            if(result == 1)
                    return bot.reply(message, 'Voted!');
            });
        });
    });
});

// list all agendas 
controller.hears('list all agendas',['direct_message,direct_mention,mention'], function(bot, message) {
    db.find({ type: 'agenda' }, function (err, docs) {
        if(docs.length > 0) {
            let result = [];
            docs.map(function(x){
               result.push(x); 
            });
            var formatResponse = formatString(result);
            return bot.reply(message, formatResponse);
        }
        else if (docs === null || docs === undefined) {
            return bot.reply(message, 'no agendas');
        }
    });
});

controller.hears('list all topics for agenda (.*)',['direct_message,direct_mention,mention'], function(bot, message){
    let agenda = message.match[1].trim();
    db.find({agendaId:agenda}, function(err, topics) {
            let result = [];
            topics.forEach(function(x){
               result.push(`${x._id} - ${x.topic}`); 
            });
            var formatResponse = formatString(result);
            return bot.reply(message, formatResponse);
    });
});


controller.hears('next agenda?', ['direct_message,direct_mention,mention'], function(bot,message){
    var results = [];
    db.find({type:'agenda'}, function(err, docs){
        if(docs.length == 0)
            return bots.reply(message, 'No Agenda, Add One!');
        
        var sorted = sortByDate(docs);
        var first = sorted[0];
        results.push(`${first.date} - ${first.agenda} (${first._id})`);
        
        db.find({agendaId:first._id, type:'topic'}, function(err, topics) {
            if(topics.length > 0)
            {
                topics.forEach(function(x){
                results.push(`- (${x._id}) ${x.topic} - (${x.votes.length})`);
                });
            }
            else {
                results.push('- No Topics, add one!');
            }
            var formatResponse = formatString(results);
            return bot.reply(message, formatResponse);
        });
    });
});

controller.hears('shutdown', ['direct_message,direct_mention,mention'], function(bot, message) {
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

 //crappy, make better later
 controller.hears('Delete Topic (.*)', [], function(bot, message) {
     let topicId = message.match[1].trim();
     db.remove({ _id: topicId }, {}, function (err, numRemoved) {
      if(err)
        console.log('asdf');//do stuff
    });
 });
 
 //crappy, make better later
 controller.hears('Delete Agenda (.*)', [], function(bot, message) {
    let agendaId = message.match[1].trim();
    db.remove({ _id: agendId }, {}, function (err, numRemoved) {
       if(err)
        console.log('asdf');//do stuff
    });
    db.remove({ agendaIa: agendId }, {}, function (err, numRemoved) {
      if(err)
        console.log('asdf');//do stuff
    });
 });
 
 // delete agenda (deletes all topics associated) {agendaId}
controller.hears('uptime',
    ['direct_message,direct_mention,mention'], function(bot, message) {
        let hostname = os.hostname();
        let uptime = formatUptime(process.uptime());
        console.log('here');
        return bot.reply(message, `:robot_face: I am a bot named @${bot.identity.name} - I have been running for ${uptime} on ${hostname}.`);
    });


controller.hears('help', ['direct_message','direct_mention','mention'], function(bot, message){
    let helpText = [
    'for {date} create new agenda {agenda} - Creates new agenda for a given date.',
    'for agenda {agendaId} add new topic {topic} - Adds new topic for given agenda.',
    'for agenda {agendaId} vote for topic {topicId} - Vote for topic.',
    'list all agendas - Lists all available agendas.',
    'list all topics for agenda {agendaId} - Lists all topics for agenda.',
    'uptime - How long has the bot been up.',
    'shutdown - Shutdown the lean bot.'
    ];
    var formatResponse = formatString(helpText);
    return bot.reply(message, formatResponse);
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

function formatString(result)
{
     return '```' + result.join('\n') + '```';
}


function sendReply(bot, message, text){
    let result = text ? formatString(text) : 'something happened, check bot logs';
    bot.reply(message. result);
}