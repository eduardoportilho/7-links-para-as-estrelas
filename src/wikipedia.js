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
 * @typedef {Object} ContinueData
 * @property {string} continue
 * @property {string} accontinue
 */

class Wikipedia {
  /**
   * @param  {string} title
   * @return {Page}
   */
  getPage (title) {
    const pages = this.getPages([title])
    return pages[title]
  }

  /**
   * @param  {string[]} titles
   * @return {Object} {title : Page}
   */
  async getPages (titles) {
    let endpoint = this._getQueryEndpoint(titles)
    let data = await this._get(endpoint)
    let queryResults = [data]
    while (data.continue) {
      endpoint = this._addContinueParams(endpoint, data.continue)
      data = await this._get(endpoint)
      queryResults.push(data)
    }
    const mergedResults = this._merge(queryResults)
    return this._dataToPages(mergedResults)
  }

  _get (titles) {
    return new Promise((resolve, reject) => {
      const endpoint = this.getQueryEndpoint(titles)
      // console.log(`GET ${endpoint}`)
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
  _addContinueParams (endpoint, continueData) {}

  /**
   * @param  {QueryResult[]} queryResults
   * @return {QueryResult} Merged query result
   */
  _merge (queryResults) {}

  /**
   * @param  {QueryResult} queryResult
   * @return {Object} {title : Page}
   */
  _dataToPages (queryResult) {}
}

export default new Wikipedia()
