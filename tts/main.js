const voices = require("./info").voices;
const qs = require("querystring");
const brotli = require("brotli");
const https = require("https");
const md5 = require("js-md5");
const http = require("http");

// Fallback option for compatibility between Wrapper and https://github.com/Windows81/Text2Speech-Haxxor-JS.
let get;
try {
	get = require("../misc/get");
} catch {
	get = require("./get");
}

module.exports = (voiceName, text) => {
	return new Promise(async (res, rej) => {
		const voice = voices[voiceName];
		switch (voice.source) {
			case "nextup": {
				https.get("https://nextup.com/ivona/index.html", (r) => {
					var q = qs.encode({
						voice: voice.arg,
						language: `${voice.language}-${voice.country}`,
						text: text,
					});
					var buffers = [];
					https.get(`https://nextup.com/ivona/php/nextup-polly/CreateSpeech/CreateSpeechGet3.php?${q}`, (r) => {
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => {
							const loc = Buffer.concat(buffers).toString();
							if (!loc.startsWith("http")) rej();
							get(loc).then(res).catch(rej);
						});
						r.on("error", rej);
					});
				});
				break;
			}
			case "polly": {
                var req = https.request({
                        hostname: "voicemaker.in",
						port: "443",
                        path: "/voice/standard",
                        method: "POST",
                        headers: {
							"content-type": "application/json",
							referer: "https://voicemaker.in/",
                            "x-requested-with": "XMLHttpRequest",
                        },
                    },
                    (r) => {
						var buffers = [];
						r.on("data", (b) => buffers.push(b));
                        r.on("end", () => {
							const json = Buffer.concat(buffers);
							const beg = json.indexOf('"path":') + 9;
					        const end = json.indexOf('",', beg);
					        const sub = json.subarray(beg, end).toString();
							console.log("Successfully retrieved MP3 stream:");
							console.log(`https://voicemaker.in${sub}`);
							get(`https://voicemaker.in${sub}`).then(res).catch(rej);
						});
						r.on("error", rej);
					});
					req.write(`{"Engine":"standard","Provider":"ai101","OutputFormat":"mp3","VoiceId":"${voice.arg}","LanguageCode":"${voice.language}-${voice.country}","SampleRate":"22050","effect":"default","master_VC":"advanced","speed":"0","master_volume":"0","pitch":"0","Text":"${text}","TextType":"text","fileName":""}`);
					req.end();
					break;
			}
			case "cepstral": {
                https.get('https://www.cepstral.com/en/demos', r => {
                    const cookie = r.headers['set-cookie'];
                    var q = qs.encode({
                        voice: voice.arg,
                        voiceText: text,
                        rate: 170,
                        pitch: 1,
                        sfx: 'none',
                    });
                    var buffers = [];
                    var req = https.get({
                        host: 'www.cepstral.com',
                        path: `/demos/createAudio.php?${q}`,
                        headers: { Cookie: cookie },
                        method: 'GET',
                    }, r => {
                        r.on('data', b => buffers.push(b));
                        r.on('end', () => {
                            var json = JSON.parse(Buffer.concat(buffers));
                            get(`https://www.cepstral.com${json.mp3_loc}`).then(res).catch(rej);
                        })
                    });
                });
                break;
            }
			case "vocalware": {
				var [eid, lid, vid] = voice.arg;
				var cs = md5(`${eid}${lid}${vid}${text}1mp35883747uetivb9tb8108wfj`);
				var q = qs.encode({
					EID: voice.arg[0],
					LID: voice.arg[1],
					VID: voice.arg[2],
					TXT: text,
					EXT: "mp3",
					IS_UTF8: 1,
					ACC: 5883747,
					cache_flag: 3,
					CS: cs,
				});
				var req = https.get(
					{
						host: "cache-a.oddcast.com",
						path: `/tts/gen.php?${q}`,
						headers: {
							Referer: "https://www.oddcast.com/",
							Origin: "https://www.oddcast.com/",
							"User-Agent":
								"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36",
						},
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => res(Buffer.concat(buffers)));
						r.on("error", rej);
					}
				);
				break;
			}
			case "voiceforge": {
				const q = new URLSearchParams({						
						msg: text,
						voice: voice.arg,
						email: "null",
					}).toString();
					
					https.get({
						host: "api.voiceforge.com",
						path: `/swift_engine?${q}`,
						headers: { 
							HTTP_X_API_KEY: '8b3f76a8539',
							'Accept-Encoding': 'identity',
							'Icy-Metadata': '1',
						 }
					}, (r) => {
						fileUtil.convertToMp3(r, "wav").then(res).catch(rej);
					}).on("error", rej);
					break;
				}
			case "voicery": {
				var q = qs.encode({
					text: text,
					speaker: voice.arg,
					ssml: text.includes("<"),
					//style: 'default',
				});
				https.get(
					{
						host: "www.voicery.com",
						path: `/api/generate?${q}`,
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => res(Buffer.concat(buffers)));
						r.on("error", rej);
					}
				);
				break;
			}
			case "watson": {
				var q = qs.encode({
					text: text,
					voice: voice.arg,
					download: true,
					accept: "audio/mp3",
				});
				https.get(
					{
						host: "text-to-speech-demo.ng.bluemix.net",
						path: `/api/v1/synthesize?${q}`,
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => res(Buffer.concat(buffers)));
						r.on("error", rej);
					}
				);
				break;
			}
			case "readloud": {
				const req = https.request(
					{
						host: "gonutts.net",
						path: voice.arg,
						method: "POST",
						port: "443",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
						},
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => {
							const html = Buffer.concat(buffers);
							const beg = html.indexOf("/tmp/");
							const end = html.indexOf(".mp3", beg) + 4;
							const sub = html.subarray(beg, end).toString();
							const loc = `https://gonutts.net${sub}`;
							get(loc).then(res).catch(rej);
						});
						r.on("error", rej);
					}
				);
				req.end(
					qs.encode({
						but1: text,
						but: "Enviar",
					})
				);
				break;
			}
			case "cereproc": {
				const req = https.request(
					{
						hostname: "www.cereproc.com",
						path: "/themes/benchpress/livedemo.php",
						method: "POST",
						headers: {
							"content-type": "text/xml",
							"accept-encoding": "gzip, deflate, br",
							origin: "https://www.cereproc.com",
							referer: "https://www.cereproc.com/en/products/voices",
							"x-requested-with": "XMLHttpRequest",
							cookie: "Drupal.visitor.liveDemo=666",
						},
					},
					(r) => {
						var buffers = [];
						r.on("data", (d) => buffers.push(d));
						r.on("end", () => {
							const xml = String.fromCharCode.apply(null, brotli.decompress(Buffer.concat(buffers)));
							const beg = xml.indexOf("https://cerevoice.s3.amazonaws.com/");
							const end = xml.indexOf(".mp3", beg) + 4;
							const loc = xml.substr(beg, end - beg).toString();
							get(loc).then(res).catch(rej);
						});
						r.on("error", rej);
					}
				);
				req.end(
					`<speakExtended key='666'><voice>${voice.arg}</voice><text>${text}</text><audioFormat>mp3</audioFormat></speakExtended>`
				);
				break;
			}
		}
	});
};
