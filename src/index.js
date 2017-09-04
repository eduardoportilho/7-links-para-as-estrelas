import _ from 'lodash'
import wikipedia from './wikipedia'

function getPathToInitialPage (page) {
  const path = [page]
  let currentPage = page
  while (currentPage.parent) {
    currentPage = currentPage.parent
    path.unshift(currentPage)
  }
  return path
}

function findPaths (pages, targetTitle) {
  const lowerTargetTitle = targetTitle.toLowerCase()
  return pages.filter(page => (page.title.toLowerCase() === lowerTargetTitle))
    .map(getPathToInitialPage)
}

const MAX_DEPTH = 2

async function setelinksParaAsEstrelas (initialTitle, targetTitle) {
  let initialPage = await wikipedia.getPage(initialTitle)

  let foundPaths = []
  let depth = MAX_DEPTH
  let pagesInDepth = [initialPage]

  while (depth >= 0) {
    let nextDepthPages = []

    // get all links for wp
    let links = _.flatten(pagesInDepth.map(page => page.links))
    let allLinkedPages = await wikipedia.getPages(links)

    // build tree
    for (let page of pagesInDepth) {
      page.linkedPages = page.links.map(link => {
        // TODO : not all links ar in allLinkedPages
        let linkedPage = null
        if (allLinkedPages[link]) {
          linkedPage = _.clone(allLinkedPages[link])
        } else {
          linkedPage = {title: link, links: []}
        }
        linkedPage.parent = page
        return linkedPage
      })
      nextDepthPages = _.concat(nextDepthPages, page.linkedPages)
    }

    // find paths in depth
    let paths = findPaths(nextDepthPages, targetTitle)
    foundPaths = _.concat(foundPaths, paths)

    pagesInDepth = nextDepthPages
    depth--
  }
  console.log(`>>>`, foundPaths)
}

setelinksParaAsEstrelas('Vince Vaughn', 'Jennifer Aniston')
