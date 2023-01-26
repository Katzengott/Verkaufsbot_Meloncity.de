const mineflayer = require('mineflayer')
const http = require("http")
const fetch = require('node-fetch');
const Vec3 = require('vec3');
const delay = require('util').promisify(setTimeout)
const bot = mineflayer.createBot({
    host: "meloncity.de",
    username: "",
    auth: "microsoft",
    version: "1.19.2",
    colorsEnabled: false,
    viewDistance: "short",
})

//Variablen
var start = false //Bei true startet der Bot
var pay = true; //True oder False bei lässt der Bot neue Käufer zu
const whurl = "" //Webhook
var account = ""//Dein Main Account
var token = ""// Dein Selbst erstellten Token
var werbung = ""//Deine Werbungsnachricht
bot.once('spawn', () => {
    bot.chat("/home")
    bot.once('windowOpen', () => {
        bot.clickWindow(0, 1, 0)
        start = true
    })

})
//Events
bot.on('messagestr', async(msg) => {
    if (start === false) return
    //console.log(msg)
    const format = msg.split(" ")
    //console.log(format[1])
    if (msg.includes("» Server «")) {
        const msgs = msg
        if (msgs.includes("hat dir")) {
            if (pay === true) {
                pay = false
                //console.log("User: " + format[5])
                //console.log("User: " + format[8].replace("€", ""))
                checkBuyerArea(format[5], format[8].replace("€", ""))
            } else {
                //console.log("Jemand will einkaufen wärend jemand anderes einkauft")
                //console.log("User: " + format[5])
                //console.log("User: " + format[8].replace("€", ""))
                bot.chat("/msg " + format[5] + " Gerade kauft schon jemand ein! Gedulde dich einen Moment! Dein Geld wird in kürze überwiesen!")
                bot.chat("/pay " + format[5] + " " + format[8].replace("€", ""))
            }
        }

    }
})

setInterval(() => {
    if (start === true) {
        saveroom()
        //console.log(pay)
    } else {
        console.log("Der Bot ist noch nicht ready!")
    }
}, 1000);

setInterval(() => {
    if (start === true) {
        bot.chat(werbung)
    } else {
    }
}, 600000);
//Funktionen

function saveroom() {
    const filter = e => (e.type === 'mob' || e.type === 'player') && e.position.distanceTo(bot.entity.position) < 5 && e.mobType !== 'Armor Stand'
    const entity = bot.nearestEntity(filter)
    //console.log(entity)
    if (entity === null) return;
    if (entity.username === account) return
    if (entity.username === "RedMinecraftFloh") return
    if (entity.username === "TaktischeKatze") return
    bot.chat(`/gs deny ${entity.username}`)
    deny(entity.username)

}

function checkMoney(buyer, cash) {
    console.log("http://:2515/get/" + token + "/" + cash)
    http.get("http://:2515/get/" + token + "/" + cash, res => {

        let rawData = ''

        res.on('data', chunk => {
            rawData = chunk
        })

        res.on('end', async () => {
            const parsedData = JSON.parse(rawData)
            try {
                console.log(parsedData[0])
                if (!parsedData[0]) {
                    console.log("Fail")
                    bot.chat("/pay " + buyer + " " + cash)
                    pay = true
                } else {
                    console.log("Alles Gut")
                    if (parsedData[0].status) {
                        takeItemsfromChest(parsedData[0], buyer, cash)
                    } else {
                        bot.chat("/pay " + buyer + " " + cash)
                        pay = true
                    }
                }
            } catch {}
        })
    })
}

function checkBuyerArea(buyer, cash) {
    const filter = e => (e.type === 'player') && e.position.distanceTo(bot.entity.position) < 7 && e.mobType !== 'Armor Stand'
    const entity = bot.nearestEntity(filter)
    //console.log(entity)

    try {
        if (entity.username === buyer) {
            //console.log("Du bist im vorgegebenen Bereich")
            pay = false;
            console.log("Du bist: " + buyer)
            console.log("Du hast: " + cash)
            //buyer1 = buyer
            checkMoney(buyer, cash)

        }
    } catch {
        bot.chat("/pay " + buyer + " " + cash)
        pay = true
        bot.chat("/msg " + buyer + " Du musst in den Verkaufsraum gehen, um mit den Bot handeln zu können!")
        //console.log("War nicht im Radius")
    }
}
async function takeItemsfromChest(parsed, buyer, cash) {
    point = new Vec3(parsed.x_chest, parsed.y_chest, parsed.z_chest)
    await bot.lookAt(point)
    await delay(500)
    const chest = await bot.openChest(bot.blockAt(point))
    console.log("Chest open withdraw")
    var id = bot.registry.itemsByName[parsed.type].id
    try {
        await chest.withdraw(id, null, parseInt(parsed.count))
        chest.close()
        console.log("Tset")
        await delay(1000)
        points = new Vec3(1733, 64, 3212)
        await bot.lookAt(points)
        bot.toss(id, null, parsed.count)
        pay = true
    } catch {
        chest.close()
        console.log("Kiste leer")
        bot.chat("/msg " + buyer + "Die Kiste ist leer. Du bekommst in kürze dein Geld zurück")
        bot.chat("/pay " + buyer + " " + cash)
        pay = true

        fetch('http://:2515/post/change', {
                method: 'PATCH',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "_id": parsed._id,
                    "status": false,
                    "token": parsed.token,
                    "type": parsed.type
                })
            })
            .then(response => response.json())
        
        const msg = {
            "content": "Die Kiste ist leer. Type: " + parsed.type + " Preis: " + cash
        }
        msg.username = "ERROR"
        fetch(whurl + "?wait=true", {
                "method": "POST",
                "headers": {
                    "content-type": "application/json"
                },
                "body": JSON.stringify(msg)
            })
            .then(a => a.json().then(console.log))
            
    }
}
async function deny(deny) {
    //Verschickt die Nachricht zur Aufklärung über den Ban
    console.log("Before the delay")

    //await delay(1);
    bot.chat(`/msg ${deny} [Bot] Sicherheitsmaßnahme: Du hast soeben den Sicherheitsbereich betreten. Zum Diebstahlschutz wurdest du vom Grundstück gebannt. Bei Problemen /msg TaktischeKatze`)
}
bot.on("kicked", console.log)
bot.on("error", console.log)
