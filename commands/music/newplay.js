//Importing needs
const { PREFIX } = require('../util/lechsbottUtil');
const Discord = require('discord.js');
const Voice = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const { promisify } = require('util');

const wait = promisify(setTimeout);

//Set the queue
const queue = new Map();

module.exports = {
  name: 'play',
  cooldown: 5,
  aliases: ['p', 'skip'],
  description: '',
  async execute(client, message, args, cmd) {
    const voiceChannel = message.member.voice;
    const server_queue = queue.get(message.guild.id);

    let player = Voice.joinVoiceChannel({
      channelId: voiceChannel.channel.id,
      guildId: voiceChannel.channel.guild.id,
      adapterCreator: voiceChannel.channel.guild.voiceAdapterCreator,
    });

    if (cmd === 'play' || cmd === 'p') {
      if (!args[0]) {
        let argsembed = new Discord.MessageEmbed()
          .setAuthor(
            `l!play [query]`,
            message.author.displayAvatarURL({ dynamic: true })
          )
          .addField(`youtube`, `search/link/playlist`, true)
          .addField(`spotify`, `link/playlist`, true)
          .addField('soundcloud', 'link/playlist', true);
        return message.channel.send({ embeds: [argsembed] });
      }

      try {
        await Voice.entersState(
          player,
          Voice.VoiceConnectionStatus.Ready,
          20000
        );
      } catch {
        const embed = new Discord.MessageEmbed().setDescription(
          `**Failed to join voice channel within 20 seconds, please try again later!**`
        );
        message.channel.send({ embeds: [embed] });
        return;
      }

      songFinder(message, args, client, player, voiceChannel);
    }


    else if(cmd === 'skip') skip(message, args, client, server_queue, voiceChannel);

  }
};

async function songFinder(message, args, client, player, voiceChannel) {
  const Discord = require('discord.js');
  const ytemoji = client.emojis.cache.get('846030610526634005');

  let song = {};

  if (ytdl.validateURL(args[0])) {
    message.channel.send(
      `${ytemoji} **Searching** :mag_right: \`${args.join(' ')}\``
    );

    const song_info = await ytdl.getInfo(args[0]);
    const ytsinfo = await ytSearch({
      videoId: song_info.videoDetails.videoId,
    });

    song = {
      url: song_info.videoDetails.video_url,
      title: song_info.videoDetails.title,
      type: 'normal',
      app: 'YouTube',
      customurl: song_info.videoDetails.video_url,
      addedby: message.author.username,
      addedid: message.author.id,
      duration: ytsinfo.duration.timestamp,
    };
    await handleResource(song, message, args, voiceChannel, player, 'false');
  } else {
    message.channel.send(
      `${ytemoji} **Searching** :mag_right: \`${args.join(' ')}\``
    );
    //If there was no link, we use keywords to search for a video. Set the song object to have two keys. Title and URl.
    const video_finder = async (query) => {
      const video_result = await ytSearch(query);
      return video_result.videos.length > 1 ? video_result.videos[0] : null;
    };

    const video = await video_finder(args.join(' '));
    if (video) {
      song = {
        title: video.title,
        url: video.url,
        type: 'normal',
        app: 'YouTube',
        customurl: video.url,
        addedby: message.author.username,
        addedid: message.author.id,
        duration: video.duration.timestamp,
      };
    } else {
      const embed = new Discord.MessageEmbed().setDescription(
        `**No videos found within** \`${args.join(' ')}\` on YouTube!`
      );
      return message.channel.send({ embeds: [embed] });
    }
    await handleResource(song, message, args, voiceChannel, player, 'false');
  }
}

async function handleResource(
  video,
  message,
  args,
  voice_channel,
  player,
  playlist
) {
  const Discord = require('discord.js');
  const server_queue = queue.get(message.guild.id);

  const song = {
    title: video.title,
    url: video.url,
    type: video.type,
    app: video.app,
    customurl: video.customurl,
    addedby: video.addedby,
    addedid: video.addedid,
    duration: video.duration,
  };
  console.log(song);

  if (!server_queue) {
    console.log('Creating a new server_queue');

    const queue_constructor = {
      voice_channel: voice_channel,
      text_channel: message.channel,
      player: null,
      connection: null,
      songs: [],
      volume: '1',
      playing: true,
    };

    queue.set(message.guild.id, queue_constructor);
    queue_constructor.songs.push(song);

    const lechsbottPlayer = async (guild, song) => {
      const song_queue = queue.get(guild.id);

      if (song.type === 'normal') {
        const stream = ytdl(song.url, { filter: 'audioonly' });
        let resource = Voice.createAudioResource(stream);

        player.subscribe(song_queue.player);
        song_queue.player.play(resource);
      }

      song_queue.player.on('stateChange', async (oldState, newState) => {
        console.log(
          `Audio player transitioned from ${oldState.status} to ${newState.status}`
        );

        if (newState.status === Voice.VoiceConnectionStatus.Disconnected) {
          if (
            newState.reason ===
              Voice.VoiceConnectionDisconnectReason.WebSocketClose &&
            newState.closeCode === 4014
          ) {
            /*
						If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
						but there is a chance the connection will recover itself if the reason of the disconnect was due to
						switching voice channels. This is also the same code for the bot being kicked from the voice channel,
						so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
						the voice connection.
					*/
            try {
              await Voice.entersState(
                song_queue.connection,
                Voice.VoiceConnectionStatus.Connecting,
                5_000
              );
              // Probably moved voice channel
            } catch {
              song_queue.connection.destroy();
              // Probably removed from voice channel
            }
          } else if (song_queue.connection.rejoinAttempts < 5) {
            /*
						The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
					*/
            await wait((song_queue.connection.rejoinAttempts + 1) * 5_000);
            song_queue.connection.rejoin();
          } else {
            /*
						The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
					*/
            song_queue.connection.destroy();
          }
        } else if (newState.status === Voice.VoiceConnectionStatus.Destroyed) {
          song_queue.player.stop(true);
        }

        if (oldState.status === 'playing' && newState.status === 'idle') {
          if (song_queue.songs[1]) {
            song_queue.songs.shift();
            lechsbottPlayer(message.guild, song_queue.songs[0]);
          } else {
            queue.delete(guild.id);
            song_queue.player.stop(true);
            console.log('deleted song queue');
            return;
          }
        }
      });

      song_queue.connection.on('stateChange', async (oldState, newState) => {
        console.log(
          `Connection transitioned from ${oldState.status} to ${newState.status}`
        );

        if(oldState.status === 'ready' && newState.status === 'disconnected'){
          queue.delete(guild.id);
          song_queue.player.stop(true);
        }
      })

      function converTime(timestamp) {
        const split = timestamp.split(':');

        let [minute, second] = split;

        return minute * 60 + second * 1;
      }

      let playing = new Discord.MessageEmbed()
        .setAuthor(
          (name = `Now playing`),
          (icon_url = `${message.author.displayAvatarURL({ dynamic: true })}`)
        )
        .setTitle(`${song.title}`)
        .setURL(`${song.customurl}`)
        .setFooter(`${song.addedby}`)
        .setTimestamp();
      const m = await song_queue.text_channel.send({ embeds: [playing] })

      if (song_queue.songs[1]) {
        m.react('⏭️')

        const filter = (reaction, user) => {
          return (
            ['⏭️'].includes(reaction.emoji.name) &&
            user.id === message.author.id
          );
        };

        m.awaitReactions(filter, {
          max: 1,
          time: converTime(song_queue.songs[0].duration),
          errors: ['time'],
        }).then(async (collected) => {
          const reaction = collected.first();

          if (reaction.emoji.name === '⏭️') {
            const embed = new Discord.MessageEmbed()
            .setDescription(
              `**Skipped to** \`${song_queue.songs[1].title}\``
            );
            message.channel.send({ embeds: [embed] });

            song_queue.player.stop(true);
          }
        });
      }
    };

    try {
      let player = Voice.createAudioPlayer({
        behaviors: { noSubscriber: Voice.NoSubscriberBehavior.Stop },
      });
      queue_constructor.player = player;
      const connection = Voice.getVoiceConnection(
        queue_constructor.text_channel.guild.id,
        'default'
      );
      queue_constructor.connection = connection;

      lechsbottPlayer(message.guild, queue_constructor.songs[0]);
    } catch (err) {
      queue.delete(message.guild.id);
      player.stop();
      const embed = new Discord.MessageEmbed().setDescription(
        `**There was an error connecting!**`
      );
      message.channel.send({ embeds: [embed] });
      throw new Error(err);
    }
  } else {
    console.log('Using existing server_queue');
    server_queue.songs.push(song);

    if (playlist === 'youtubeplaylist') return undefined;
    else if (playlist === 'spotifyplaylist') return undefined;
    else if (playlist === 'soundcloudplaylist') return undefined;
    else if (playlist === 'false') {
      const member = message.author;
      let memberavatar = member.displayAvatarURL();
      let queueInfo = new Discord.MessageEmbed()
        .setAuthor((name = `Added to queue`), (icon_url = `${memberavatar}`))
        .setTitle(`${song.title}`)
        .setURL(`${song.customurl}`)
        .setTimestamp()
        .setFooter(`${song.addedby}`);

      return message.channel.send({ embeds: [queueInfo] }).then((message) => {
        message.react('👍');
      });
    }
  }
  return undefined;
}

const skip = (message, args, client, server_queue, voiceChannel) => {
  if(!voiceChannel){
    const embed = new Discord.MessageEmbed()
    .setDescription(`**You need to be in a voice channel to execute this command.**`)
    return message.channel.send({ embeds: [embed] });
  }
  if(!server_queue){}
}
