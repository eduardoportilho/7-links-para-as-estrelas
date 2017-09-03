import jsonp from 'jsonp'
import _ from 'lodash'

let visitedTitles = []

function getPages (titles, parent) {
  return new Promise((resolve, reject) => {
    jsonp(getQueryEndpoint(titles), (err, data) => {
      visitedTitles = visitedTitles.concat(titles)
      if (err) {
        reject(err)
      } else {
        resolve(dataToPages(data, parent))
      }
    })
  })
}

function getQueryEndpoint (titles) {
  const encodedTitles = encodeURIComponent(titles.join('|'))
  // return `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=links%7Cinfo&pllimit=500&titles=${title}`
  return `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=links%7Cinfo&pllimit=500&titles=${encodedTitles}`
}

function dataToPages (data, parent) {
  const pages = []
  for (let pageId in data.query.pages) {
    let page = data.query.pages[pageId]
    let links = []
    if (page.links) {
      // remove links visitados
      links = _.uniq(page.links)
        .filter(link => visitedTitles.indexOf(link.title) < 0)
        .map(link => ({title: link.title}))
    }
    pages.push({
      id: pageId,
      title: page.title,
      parent: parent,
      links: links
    })
  }
  return pages
}

async function convertLiksToPages (page) {
  // Specifying titles through the query string (either through titles or pageids) is limited to 50 titles per query
  const linkChunks = _.chunk(page.links, 50)
  const pageChunks = await Promise.all(
    linkChunks.map(async (links) => {
      try {
        return await getPages(links.map(link => link.title), page)
      } catch (any) {
        console.log(`X Error:`, any)
        return null
      }
    })
  )
  const pages = _.flatten(pageChunks).filter(page => page !== null)
  page.links = pages
  return pages
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
  let initialPage = await getPages([initialTitle])

  let foundPaths = []
  let depth = MAX_DEPTH
  let pagesInDepth = initialPage

  while (depth >= 0) {
    // console.log(`Depth: ${MAX_DEPTH - depth}, visited links: ${++visitedTitles.length}`)
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
