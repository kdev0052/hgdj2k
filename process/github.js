const createRelatedAccounts = async function(user, page, snap) {
    await page.waitFor(300)
    await page.goto('https://github.com/settings/tokens/new')
    await page.waitFor(2000)


    await snap(page, "GH0-LOGIN")
    const shouldlogin = await page.evaluate(() => document.querySelector("#oauth_access_description")== undefined)
    if(shouldlogin) {

        await page.type("#login_field", user.email)
        await page.type("#password", user.password)
        await page.waitFor(200)
        await page.click("#login > form > div.auth-form-body > input.btn.btn-primary.btn-block")
        await page.waitFor(1600)

    }

    await snap(page, "GH1-POSTLOGIN")

    await page.type("#oauth_access_description", Math.floor(Math.random() * 100) + user.userName + Math.floor(Math.random() * 100))
    await page.evaluate(() => document.querySelectorAll('[type="checkbox"]').forEach(k => k.click()))
    await page.click("#new_oauth_access > p > button")

    await page.waitFor(1000)
    const apiKey = await page.evaluate(() => document.querySelector("#new-oauth-token").textContent)

    await page.waitFor(200)


    await page.goto("https://github.com/new")
    await page.type("#repository_name", user.userName.substring(0, 5))
    await page.click("#repository_visibility_private")
    await page.waitFor(200)
    await page.click("#repository_auto_init")
    await page.waitFor(200)
    await page.click('#new_repository > div.js-with-permission-fields > button[type="submit"]')
    await page.waitFor(200)


    await page.waitFor(600)
    await page.goto("https://zeit.co/signup")
    await page.waitFor(1000)
 await page.click("#__next .github-form button")

    await page.waitFor(2000)
    await page.evaluate(
        () => {
            let d = document.querySelector("#js-oauth-authorize-btn")
            if(d) d.click()
        }
    )

    await page.waitFor(600)

    await snap(page, "GH1-ZEIT")
  
   await page.evaluate(
        () => {
            let d = document.querySelector("#js-oauth-authorize-btn")
            if(d) d.click()
        }
    )

let zeitCoToken
try {
await page.waitFor(1500)
    //await snap(page, "GH1.5-ZEIT")
    await page.goto("https://zeit.co/account/tokens")
    await page.waitFor(1500)
      await snap(page, "GH2-ZEIT")
    await page.waitFor(1800)  
    await page.click(".actions > button")
    await page.waitFor(600)
    await page.type('input[placeholder="New Token"]', "apptoken")
    await page.click("body div.wrapper.active > div > div.focus-trap > footer > button:nth-child(2)")
    await page.waitFor(600)
    zeitCoToken = await page.evaluate(() => document.querySelector("body  div.wrapper.active > div > div.focus-trap > div > div > input").value)
    
} catch (e) {
    console.log("nonfatal zeit err :", e)
}

    return {
        user: user,
        apiKey: apiKey,
        zeitCoToken: zeitCoToken
    }
}


exports.createRelatedAccounts = createRelatedAccounts
