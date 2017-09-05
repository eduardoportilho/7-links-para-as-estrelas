import _ from 'lodash'
import jsonp from 'jsonp'

/**
 * @typedef {Object} Page
 * @property {number} id - Page ID.
 * @property {string} title - Page title.
 * @property {Page} parent - Parent page.
 * @property {string[]} links - Title of the linked pages.
 * @property {Page[]} [linkedPages] - Linked pages (may be undefined).
 */

/**
 * @typedef {Object} QueryResult
 * @property {ContinueData} [continue]
 * @property {Object} query
 * @property {Object} query.pages - {id: QueryResultPage}
 */

/**
 * @typedef {Object} ContinueData
 */

/**
 * @typedef {Object} QueryResultPage
 * @property {number} pageid - Page ID.
 * @property {string} title - Page title.
 * @property {Object[]} links - Title of the linked pages.
 * @property {string} links.title - Linked page title.
 */

class Wikipedia {
  /**
   * @param  {string} title
   * @return {Page}
   */
  async getPage (title) {
    const pages = await this.getPages([title])
    return pages[title]
  }

  /**
   * @param  {string[]} titles
   * @return {Object} {title : Page}
   */
  async getPages (titles) {
    const titleChunks = _.chunk(titles, 50)
    let allResults = []
    for (let titleChunk of titleChunks) {
      let endpoint = this._getQueryEndpoint(titleChunk)
      // TODO: is it possible to parallelize?
      let chunkResults = await this._getAndContinue(endpoint)
      allResults = _.concat(allResults, chunkResults)
    }
    const mergedResults = this._mergeQueryResults(allResults)
    return this._dataToPages(mergedResults)
  }

  /**
   * @param  {string} endpoint
   * @return {QueryResult[]}
   */
  async _getAndContinue (endpoint) {
    const allResults = []
    let nextPageEndpoint = endpoint
    let shouldQueryNextPage = true
    while (shouldQueryNextPage) {
      let queryResults = await this._get(nextPageEndpoint)
      allResults.push(queryResults)
      shouldQueryNextPage = queryResults.continue !== undefined
      nextPageEndpoint = shouldQueryNextPage && this._addContinueParamsToEndpoint(endpoint, queryResults.continue)
    }
    return allResults
  }

  /**
   * @param  {string} endpoint
   * @return {Promise.<QueryResult>}
   */
  _get (endpoint) {
    return new Promise((resolve, reject) => {
      jsonp(endpoint, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }

  /**
   * @param  {string[]} titles
   * @return {string}
   */
  _getQueryEndpoint (titles) {
    const encodedTitles = encodeURIComponent(titles.join('|'))
    return `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=links%7Cinfo&pllimit=500&titles=${encodedTitles}`
  }

  /**
   * @param {string} endpoint
   * @param {ContinueData} continueData
   */
  _addContinueParamsToEndpoint (endpoint, continueData) {
    return _.reduce(continueData, (result, value, key) => (
      `${result}&${key}=${value}`
    ), endpoint)
  }

  /**
   * @param  {QueryResult[]} queryResultArray
   * @return {QueryResult} Merged query result
   */
  _mergeQueryResults (queryResultArray) {
    if (queryResultArray.length === 1) {
      return queryResultArray[0]
    }
    const mergedPages = {}
    for (let queryResults of queryResultArray) {
      for (let key in queryResults.query.pages) {
        let page = queryResults.query.pages[key]
        let pageId = page.pageid
        if (!mergedPages[pageId]) {
          mergedPages[pageId] = page
        } else if (!mergedPages[pageId].links) {
          mergedPages[pageId].links = page.links
        } else {
          mergedPages[pageId].links = _.unionBy(
            mergedPages[pageId].links,
            page.links,
            linkObj => linkObj.title
          )
        }
      }
    }
    return { query: { pages: mergedPages } }
  }

  /**
   * @param  {QueryResult} queryResult
   * @return {Object} {title : Page}
   */
  _dataToPages (queryResult) {
    const pages = {}
    for (let key in queryResult.query.pages) {
      let queryPage = queryResult.query.pages[key]
      pages[queryPage.title] = {
        id: queryPage.pageid,
        title: queryPage.title,
        links: queryPage.links.map(link => link.title)
      }
    }
    return pages
  }
}

export default new Wikipedia()
