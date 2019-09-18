//const Apify = require('apify');
const puppeteer = require('puppeteer')
const fs = require('fs')
//const solver = require('./solvers/solveOctocaptcha.js');
const gen = require('./generators/allGenerators.js')
const dao = require('./save/save.js')
const tempMail = require('./email_validations/tmp.js')
const github = require('./process/github.js')
const fwk = require('./base.js')


const snap = async function(page, name) {
    console.log("Screenshot " + name)
  await page.screenshot({
      fullPage: true,
      path: name+'.png'
  });
};

(async () => {

    //console.log("ENV", process.env)

    const beforeInit = new Date().getTime()

    const browser = await puppeteer.launch({
       // useApifyProxy: true,
        headless: true,
        args: [
           //  '--disable-infobars',
            '--window-position=0,0',
             '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
            '--no-sandbox',
            '--disable-setuid-sandbox',
             //  '--disable-dev-shm-usage',
            //  '--disable-accelerated-2d-canvas',
            //'--disable-gpu',
           // '--window-size=1920x1080',
          //  '--hide-scrollbars'
        ]

    })
 
 async function evadeChromeHeadlessDetection(page) {
    // Pass the Webdriver Test.
    await page.evaluateOnNewDocument(() => {
        const newProto = navigator.__proto__;
        delete newProto.webdriver;
        navigator.__proto__ = newProto;
    });

    // Pass the Chrome Test.
    await page.evaluateOnNewDocument(() => {
        // We can mock this in as much depth as we need for the test.
        const mockObj = {
            app: {
                isInstalled: false,
            },
            webstore: {
                onInstallStageChanged: {},
                onDownloadProgress: {},
            },
            runtime: {
                PlatformOs: {
                    MAC: 'mac',
                    WIN: 'win',
                    ANDROID: 'android',
                    CROS: 'cros',
                    LINUX: 'linux',
                    OPENBSD: 'openbsd',
                },
                PlatformArch: {
                    ARM: 'arm',
                    X86_32: 'x86-32',
                    X86_64: 'x86-64',
                },
                PlatformNaclArch: {
                    ARM: 'arm',
                    X86_32: 'x86-32',
                    X86_64: 'x86-64',
                },
                RequestUpdateCheckStatus: {
                    THROTTLED: 'throttled',
                    NO_UPDATE: 'no_update',
                    UPDATE_AVAILABLE: 'update_available',
                },
                OnInstalledReason: {
                    INSTALL: 'install',
                    UPDATE: 'update',
                    CHROME_UPDATE: 'chrome_update',
                    SHARED_MODULE_UPDATE: 'shared_module_update',
                },
                OnRestartRequiredReason: {
                    APP_UPDATE: 'app_update',
                    OS_UPDATE: 'os_update',
                    PERIODIC: 'periodic',
                },
            },
        };

        window.navigator.chrome = mockObj;
        window.chrome = mockObj;
    });
}



    const ibmPromise = fwk.initIbmPage(browser)


    const initGithubPage = async function() {
        const githubPage = await browser.newPage()
        await evadeChromeHeadlessDetection(githubPage)
        await githubPage.waitFor(300)
        await githubPage.goto('https://github.com/signup',{waitUntil: 'networkidle2'} )
        return githubPage
    }
    const githubPagePromise = initGithubPage()

    const fillInGithubPage = async function(usr, githubPage) {
        await githubPage.type('#user_login', usr.userName)
        await githubPage.waitFor(400)
        await snap(githubPage, "BBBFOR2")
        await githubPage.type('#user_email', usr.email)
        await githubPage.waitFor(620)
        await githubPage.type('#user_password', usr.password)
        return githubPage
    }
    const page = await githubPagePromise


    const user = {
        userName: gen.userName(),
        password: gen.password(),
        email: tempMail.getAddress(gen.userName().toLowerCase())
    }


    await page.waitFor(2000)
    await page.hover('#signup-form')
    await page.waitFor(3000)
    await page.click('#user_login')
    await page.waitFor(200)

    await snap(page, "BBBFOR")
  
    await fillInGithubPage(user, page)


    //find captcha frame
    let captchaFrame = fwk.findCaptchaFrame(page)

    await page.waitFor(2000) //TODO

    await snap(page, "BFOR")

    let alreadyResolved = await fwk.isAlreadyResolved(page, captchaFrame)
    let filePath = alreadyResolved ? "" : await fwk.downloadAudio(captchaFrame)
    const solvedCaptcha = alreadyResolved ? "" : await fwk.resolveAndValidate(filePath, ibmPromise)
    let isCaptchaSuccessful = alreadyResolved ? true : await fwk.submitCaptcha(solvedCaptcha, captchaFrame, page, snap)
    await page.waitFor(3500)
    await snap(page, "COMPLETE")
    if(!isCaptchaSuccessful) {
      console.log("isCaptchaSuccessful : false. Exiting process")
      process.exit(1)
      return;
    }
    await page.click("#signup_button")
    await page.waitFor(6500)
    await snap(page, "POST_SUBMIT")

    const shouldRevalidateCaptcha = await page.evaluate(() => document.querySelector("#signup_button") != undefined || (document.querySelector("#js-flash-container > div > div") && document.querySelector("#js-flash-container > div > div").innerText.indexOf("Unable to verify your captcha response") >= 0))

    console.log("Should revalidate captcha ? ",shouldRevalidateCaptcha)
//if shouldRevalidateCaptcha null => reload page, or even exit
    if(shouldRevalidateCaptcha) {
        await page.waitFor(3000)
        await snap(page, "REV-B4")
     
        await page.evaluate(() => {
            let c = document.querySelector('input[type="checkbox"]')
            if(c) c.click()
        })
     
        await page.waitFor(300)
        let ibmPromise2 = browser.pages().then(pages => pages.find(p => p.url().indexOf("bluemix")>=0))
        let captchaFrame2 = fwk.findCaptchaFrame(page)
        let alreadyResolved2 = await fwk.isAlreadyResolved(page, captchaFrame2)
        let filePath2 = alreadyResolved2 ? "" : await fwk.downloadAudio(captchaFrame2)
        const solvedCaptcha2 = alreadyResolved2 ? "" : await fwk.resolveAndValidate(filePath2, ibmPromise2)
        let isCaptchaSuccessful2 = alreadyResolved2 ? true : await fwk.submitCaptcha(solvedCaptcha2, captchaFrame2, page, snap)
        await page.waitFor(3500)
        await snap(page, "REV-COMPLETE")
        if(!isCaptchaSuccessful2) {
          console.log("isCaptchaSuccessful 2 : false. Exiting process")
          process.exit(1)
          return;
        }
    
        await page.click("#signup_button")
        await page.waitFor(5500)
        await snap(page, "REV-POST_SUBMIT")
    }
    console.log("validating user : ", user)
    try {
        const s = await tempMail.validateEmail(user.email.toLowerCase(), browser)
        if (!s) {
            console.log("Email validation failed")
            process.exit(1)
            return;
        }

        console.log("Completed email validation ")
        await dao.save(user, "github-nokey", "global")
        console.log("Completed dao 0 ")
        const apiKeys = await github.createRelatedAccounts(user, page, snap)
        console.log("Completed retrieve api keys ")
        await dao.save(user, "github", "global", {
            zeit: apiKeys.zeitCoToken
        }, apiKeys.apiKey)
        console.log("Completed dao 1 ")
        console.log("Saved in DB ")
    } catch (err) {
        console.log("ERROR WHILE VALIDATING USER : ", err)
        process.exit(1)
        return;
    }
    browser.close()
})();
