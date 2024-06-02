const cheerio = require('cheerio')
const puppeteer = require('puppeteer-extra')
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
const { Cluster } = require('puppeteer-cluster')
const fs = require('fs')

require("dotenv").config();

let query = 'oil company austin';

const leadsGeneration = async (res) => {
    
    try {
		puppeteerExtra.use(stealthPlugin())

		const browser = await puppeteer.launch({
            // headless: true,
            args: [
                "--disable-setuid-sandbox",
                "--no-sandbox",
                "--single-process",
                "--no-zygote",
              ],
              executablePath:
                process.env.NODE_ENV === "production"
                  ? process.env.PUPPETEER_EXECUTABLE_PATH
                  : puppeteer.executablePath(),
        });

		const page = await browser.newPage()
		const query = 'oil company austin'

		try {
			await page.goto(
				`https://www.google.com/maps/search/${query
					.split(' ')
					.join('+')}`
			)
		} catch (error) {
			console.log('error going to page')
		}

		async function autoScroll(page) {
			await page.evaluate(async () => {
				const wrapper = document.querySelector('div[role="feed"]')

				await new Promise((resolve, reject) => {
					var totalHeight = 0
					var distance = 1000
					var scrollDelay = 3000

					var timer = setInterval(async () => {
						var scrollHeightBefore = wrapper.scrollHeight
						wrapper.scrollBy(0, distance)
						totalHeight += distance

						if (totalHeight >= scrollHeightBefore) {
							totalHeight = 0
							await new Promise((resolve) =>
								setTimeout(resolve, scrollDelay)
							)

							// Calculate scrollHeight after waiting
							var scrollHeightAfter = wrapper.scrollHeight

							if (scrollHeightAfter > scrollHeightBefore) {
								// More content loaded, keep scrolling
								return
							} else {
								// No more content loaded, stop scrolling
								clearInterval(timer)
								resolve()
							}
						}
					}, 200)
				})
			})
		}

		await autoScroll(page)

		const html = await page.content()
		const pages = await browser.pages()
		await Promise.all(pages.map((page) => page.close()))

		await browser.close()
		// console.log('browser closed')

		// get all a tag parent where a tag href includes /maps/place/
		const $ = cheerio.load(html)
		// console.log($.html)
		const aTags = $('a')
		const parents = []
		aTags.each((i, el) => {
			const href = $(el).attr('href')
			if (!href) {
				return
			}
			if (href.includes('/maps/place/')) {
				parents.push($(el).parent())
			}
		})

		const buisnesses = []

		let indexCount = -1
		parents.forEach((parent) => {
			indexCount += 1

			const url = parent.find('a').attr('href')
			// get a tag where data-value="Website"
			const website = parent.find('a[data-value="Website"]').attr('href')
			const storeName = parent.find('div.fontHeadlineSmall').text()
			// find span that includes class fontBodyMedium
			const ratingText = parent
				.find('span.fontBodyMedium > span')
				.attr('aria-label')

			// get the first div that includes the class fontBodyMedium
			const bodyDiv = parent.find('div.fontBodyMedium').first()
			const children = bodyDiv.children()
			const lastChild = children.last()
			const firstOfLast = lastChild.children().first()
			const lastOfLast = lastChild.children().last()

			buisnesses.push({
				index: indexCount,
				placeId: `ChI${url?.split('?')?.[0]?.split('ChI')?.[1]}`,
				address: firstOfLast?.text()?.split('·')?.[1]?.trim(),
				category: firstOfLast?.text()?.split('·')?.[0]?.trim(),
				phone:
					extract2(lastOfLast?.text()?.split('·')?.[1]?.trim()) ==
					true
						? lastOfLast?.text()?.split('·')?.[1]?.trim()
						: '',
				googleUrl: url,
				bizWebsite: website,
				storeName,
				ratingText,
				stars: ratingText?.split('stars')?.[0]?.trim()
					? Number(ratingText?.split('stars')?.[0]?.trim())
					: null,
				numberOfReviews: ratingText
					?.split('stars')?.[1]
					?.replace('Reviews', '')
					?.trim()
					? Number(
							ratingText
								?.split('stars')?.[1]
								?.replace('Reviews', '')
								?.trim()
					  )
					: null
			})
		})

		getWebsite(buisnesses)

		// fs.writeFileSync(`./${parsedData}.json`, JSON.stringify(buisnesses))
        // res.send(buisnesses);

	} catch (e) {
        console.error(e);
        res.send(`Something went wrong while running Puppeteer: ${e}`);
      } finally {
        await browser.close();
      }async function getWebsite(parsedData) {
        const cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            workerCreationDelay: 2000,
            puppeteerOptions: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            },
            maxConcurrency: 10
        })
    
        await cluster.task(async ({ page, data: url }) => {
            await page.goto(url?.url)
    
            const html = await page.content()
    
            const $ = cheerio.load(html)
            const aTags = $('div.RcCsl')
            let website
            let phone
            let data
            aTags.each((i, el) => {
                data = $(el)
                data
                    ?.find('button.CsEnBe')
                    ?.attr('aria-label')
                    ?.toLowerCase()
                    ?.includes('phone:') == true
                    ? (phone = data?.find('.fontBodyMedium.kR99db')?.text())
                    : null
    
                data
                    ?.find('a.CsEnBe')
                    ?.attr('aria-label')
                    ?.toLowerCase()
                    ?.includes('website:') == true
                    ? (website = data?.find('a.CsEnBe')?.attr('href'))
                    : null
            })
    
            parsedData[url?.index].bizWebsite = website
            parsedData[url?.index].phone = phone
            // console.log(url?.index, website, phone)
            res.send(parsedData);
    
            // fs.writeFileSync(`./new-modified.json`, JSON.stringify(parsedData))
        })
    
        parsedData.forEach((data) => {
            if (
                data?.phone == '' ||
                data?.bizWebsite == undefined ||
                data?.bizWebsite.includes('http') == false
            ) {
                cluster.queue({
                    index: data?.index,
                    title: data?.storeName,
                    url: data?.googleUrl
                })
            }
        })
        await cluster.idle()
        await cluster.close()
    }
    


};

module.exports = { leadsGeneration };
