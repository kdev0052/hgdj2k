

const fs = require('fs')
const initIbmPage = async function(browser) {
    let ibmPage = await browser.newPage()
    await ibmPage.waitFor(400)
    await ibmPage.goto("https://speech-to-text-demo.ng.bluemix.net",{waitUntil: 'networkidle2'} )
    await ibmPage.waitFor(400)
    await ibmPage.select('#root > div > div.flex.setup > div:nth-child(1) > p:nth-child(1) > select', 'en-US_ShortForm_NarrowbandModel')
    await ibmPage.click('#keywords', {
        clickCount: 3
    })
    await ibmPage.type('#keywords', 'one,two,three,four,five,six,seven,eight,nine,ten,zero')
    await ibmPage.evaluate(() => {
        document.querySelector("#speaker-labels").click()
    })
    return ibmPage
}

const findCaptchaFrame = function(page) {
    let captchaFrame
    for (const frame of page.mainFrame().childFrames()) {
        if (frame.url().includes('octocaptcha')) {
            for (const nestedFrame of frame.childFrames()) {
                if (nestedFrame.url().includes('funcaptcha')) {
                    captchaFrame = nestedFrame
                }
            }
        }
    }
    return captchaFrame;
}

//INIT AUDIO TOO todo rename
const isAlreadyResolved = async function(page, captchaFrame) {
    let alreadyResolved = false
    try {
        await captchaFrame.click('body > div.infoCtn > span > a.audioBtn.metaTooltipRight > span')
        await page.waitFor(600)
        //click on play
        await captchaFrame.click('#audio .audio_btn.audio_action_btn')
        await page.waitFor(600)
        await captchaFrame.click('#audio_play')
        await page.waitFor(600)
    } catch (err) {
        console.log("Captcha already resolved ")
        alreadyResolved = true;
    }
    return alreadyResolved;
}

const downloadAudio = async function(captchaFrame) {
    let byteString = await captchaFrame.evaluate(
        async () => {
            return new Promise(async resolve => {
                const reader = new FileReader();
                let audioUrl = document.querySelector("audio").src;
                let data = await fetch(audioUrl).then(
                    function(response) {
                        return response.blob()
                    }
                )
                reader.readAsBinaryString(data);
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => console.log('Error occurred while reading binary string');
            });
        }
    )
    let byteData = Buffer.from(byteString, 'binary');

    let filePath = "test.wav"
    fs.writeFile(filePath, byteData, "binary", (err) => null);

    return filePath;
}


const isValid = function(str) {
    return /^[0-9]+$/.test(str)
}

const resolveAndValidate = async function(filePath, ibmPromise) {
    const solveCaptcha = async function() {
        console.log("CALLING IBM")
        const ibmPage = await ibmPromise
        const input = await ibmPage.$('#root > div > input[type=file]');
        await input.uploadFile(filePath);
        await ibmPage.waitFor(8000)
        await ibmPage.screenshot({
            fullPage: true,
            path: 'ibm.png'
        });

        return ibmPage.evaluate(() => document.querySelector("#root > div > div.tab-panels > div > div > div").textContent.split(".").map(s => s.trim()).join(""))
    }
    let solvedCaptcha = await solveCaptcha(filePath) //TODO try multiple in parallel, and keep the one with the good number of numbers
    console.log("Solved captcha = " + solvedCaptcha);
    if (!isValid(solvedCaptcha)) {
        console.log("solved captcha is invalid. Retrying")
        solvedCaptcha = await solveCaptcha(filePath)
        console.log("Solved captcha = " + solvedCaptcha);
    }
    return solvedCaptcha;
}

const map = {
    "one" : 1,
    "two" : 2,
    "three" : 3,
    "four" : 4,
    "five" : 5,
    "six" : 6,
    "seven" : 7,
    "eight" : 8,
    "nine" : 9,
    "zero" : 0,
}
const submitCaptcha = async function(answer, captchaFrame, page, snap) {
    let solvedCaptcha = answer
    if (!isValid(answer) ) {
        console.log("Captcha is still invalid. Trying to process")
        solvedCaptcha = answer.split(" ").filter(s => s!= undefined && s.length>0).map(n => {
            if (! isNaN(n)) return n;
            const r = map[n.toLowerCase()]
            return r == undefined ? "" : r
        }).join("")
        console.log("Processed : ", solvedCaptcha)
        if (!isValid(solvedCaptcha) ) {
            console.log("Still invalid. Exit program")
            process.exit(1)
        }
    }

    await captchaFrame.type("#audio_response_field", solvedCaptcha) //TODO
    await page.waitFor(500)

    await snap(page, "CPT-B4")

    await captchaFrame.evaluate(() => document.querySelector("#audio_submit").click())
    await page.waitFor(1600)

    await snap(page, "CPT-AFT-1")

    let validationWorked = await captchaFrame.evaluate(() => document.querySelector("#audio").style.display == "none")

    if (!validationWorked) {
        console.log("Did not validate. Retry to type in")
        await captchaFrame.click('#audio .audio_btn.audio_action_btn')
        await page.waitFor(600)
        await captchaFrame.click('#audio_play')
        await page.waitFor(600)
        await captchaFrame.click('#audio_play')
        await page.waitFor(600)
        await captchaFrame.type("#audio_response_field", solvedCaptcha)
        await snap(page, "CPT-RETRY-B4")
        await page.waitFor(200)
        await captchaFrame.click("#audio_submit")


        await page.waitFor(1200)
        await snap(page, "CPT-RETRY-AFTR")

        validationWorked = await captchaFrame.evaluate(() => document.querySelector("#audio").style.display == "none")
    }
    console.log("Validated : ",validationWorked)
    return validationWorked;
}



exports.initIbmPage = initIbmPage
exports.findCaptchaFrame = findCaptchaFrame
exports.isAlreadyResolved = isAlreadyResolved
exports.downloadAudio = downloadAudio
exports.resolveAndValidate = resolveAndValidate
exports.isValid = isValid
exports.submitCaptcha = submitCaptcha
