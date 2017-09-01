import jsonp from 'jsonp'
import _ from 'lodash'

const visitedTitles = []
function getPage (title, parent) {
  return new Promise((resolve, reject) => {
    jsonp(getQueryEndpoint(title), (err, data) => {
      visitedTitles.push(title)
      if (err) {
        reject(err)
      } else {
        resolve(dataToPage(data, title, parent))
      }
    })
  })
}

function getQueryEndpoint (title) {
  // return `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=links%7Cinfo&pllimit=500&titles=${title}`
  return `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=links&pllimit=500&titles=${title}`
}

function dataToPage (data, title, parent) {
  let pageId = Object.keys(data.query.pages)[0]
  let page = data.query.pages[pageId]
  let links = []
  if (page.links) {
   links = _.uniq(page.links)
    .filter(link => visitedTitles.indexOf(link.title) < 0)
    .map(link => ({title: link.title}))
  }
  return {
    id: pageId,
    title: title,
    parent: parent,
    links: links
  }
}

async function convertLiksToPages (page) {
  let linkPages = await Promise.all(
    page.links.map(async (link) => {
      try {
        let linkPage = await getPage(link.title, page)
        return linkPage
      } catch (any) {
        console.log(`X Error:`, any)
        return null
      }
    })
  )
  linkPages = linkPages.filter(page => page !== null)
  page.links = linkPages
  return linkPages
}

function getPathsToTarget (linkedPages, targetTitle) {
  const lowerTargetTitle = targetTitle.toLowerCase()
  const paths = []
  for (let page of linkedPages) {
    if (page.title.toLowerCase() === lowerTargetTitle) {
      let path = getPath(page)
      console.log(`Found: `, path)
      paths.push(path)
    }
  }
  return paths
}

function getPath (page) {
  const path = [page]
  let currentPage = page
  while (currentPage.parent) {
    currentPage = currentPage.parent
    path.unshift(currentPage)
  }
  return path
}

const MAX_DEPTH = 3

async function setelinksParaAsEstrelas (initialTitle, targetTitle) {
  const title = encodeURIComponent(initialTitle)
  const initialPage = await getPage(title)
  let foundPaths = []
  let depth = MAX_DEPTH
  let pagesInDepth = [initialPage]

  while (depth >= 0) {
    console.log(`Depth: ${MAX_DEPTH - depth}, visited links: ${++visitedTitles.length}`)
    // console.log(`Pages in depth ${depth}`, ); 
    let nextDepthPages = []
    for (let currentPage of pagesInDepth) {
      let pagesLinkedInCurrentPage = await convertLiksToPages(currentPage)
      foundPaths = foundPaths.concat(getPathsToTarget(pagesLinkedInCurrentPage, targetTitle))
      nextDepthPages = nextDepthPages.concat(pagesLinkedInCurrentPage)
    }
    pagesInDepth = nextDepthPages
    depth--
  }
  console.log(`>>>`, foundPaths)
}

setelinksParaAsEstrelas('Vince Vaughn', 'Jennifer Aniston')
