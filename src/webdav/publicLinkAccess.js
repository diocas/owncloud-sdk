const Promise = require('promise')
const dav = require('davclient.js')
const WebdavProperties = require('./properties')

/**
 * @class PublicFiles
 * @classdesc
 * <b><i> The PublicFiles class allows access to all file and folders in a public link..</i></b><br><br>
 *
 * @author Thomas Müller
 * @version 1.0.0
 * @param   {helpers}    helperFile  instance of the helpers class
 */
class PublicFiles {
  constructor (helperFile) {
    this.helpers = helperFile
    this.davClient = new dav.Client({
      baseUrl: this.helpers._webdavUrl,
      xmlNamespaces: {
        'DAV:': 'd',
        'http://owncloud.org/ns': 'oc'
      }
    })

    // constant definitions
  }

  /**
   * Lists files in a public link as determined by the given token
   *
   * @param {string}      tokenAndPath
   * @param {string|null} password
   * @param {array}       properties
   * @param {string}      depth
   * @return {Promise<File[]>}
   */
  list (tokenAndPath, password = null, depth = '1') {
    let properties = WebdavProperties.BasicFileProperties
    return this._list(tokenAndPath, password, properties, depth)
  }

  listExtended (tokenAndPath, password = null, depth = '1') {
    let properties = WebdavProperties.BasicFileProperties.concat(WebdavProperties.PublicLinkProperties)
    return this._list(tokenAndPath, password, properties, depth)
  }

  _list (tokenAndPath, password = null, properties, depth = '1') {
    let headers = this.helpers.buildHeaders(false)
    const url = this.getFileUrl(tokenAndPath)
    if (password) {
      headers['authorization'] = 'Basic ' + Buffer.from('public:' + password).toString('base64')
    }

    return this.davClient.propFind(url, properties, depth, headers).then(result => {
      if (result.status !== 207) {
        return Promise.reject(this.helpers.buildHttpErrorFromDavResponse(result.status, result.xhr.response))
      } else {
        return Promise.resolve(this.helpers._parseBody(result.body, 1))
      }
    })
  }

  /**
   * Download the content of a file in a public link
   * @param  {string}       token    public share token - may contain the path as well
   * @param  {string|null}  path     path to a file in the share
   * @param  {string|null}  password
   * @return {Promise<Response>}
   */
  download (token, path = null, password = null) {
    let headers = this.helpers.buildHeaders(false)
    const url = this.getFileUrl(token, path)

    if (password) {
      headers['authorization'] = 'Basic ' + Buffer.from('public:' + password).toString('base64')
    }
    const init = {
      method: 'GET',
      mode: 'cors',
      headers: headers
    }

    return fetch(url, init).then(resp => {
      if (resp.ok) {
        return Promise.resolve(resp)
      }
      return resp.text().then(body => {
        return Promise.reject(this.helpers.buildHttpErrorFromDavResponse(resp.status, body))
      })
    })
  }

  /**
   * Returns the url of a public file
   * @param  {string}       token  public share token - may contain the path as well
   * @param  {string|null}  path   path to a file in the share
   * @return {string}              Url of the public file
   */
  getFileUrl (token, path = null) {
    if (path) {
      return this.helpers._buildFullWebDAVPathV2('/public-files/' + token + '/' + path)
    }
    return this.helpers._buildFullWebDAVPathV2('/public-files/' + token)
  }

  /**
   * Creates a remote directory in a public folder
   * @param  {string}            token      public share token - may contain the path as well
   * @param  {string|null}       path       path of the folder to be created at OC instance
   * @param  {string|null}       password
   * @return {Promise.<status>}  boolean: whether the operation was successful
   * @return {Promise.<error>}   string: error message, if any.
   */
  createFolder (token, path = null, password = null) {
    let headers = this.helpers.buildHeaders(false)
    const url = this.getFileUrl(token, path)

    if (password) {
      headers['authorization'] = 'Basic ' + Buffer.from('public:' + password).toString('base64')
    }

    return this.davClient.request('MKCOL', url, headers).then(result => {
      if ([200, 201, 204, 207].indexOf(result.status) > -1) {
        return Promise.resolve(true)
      }
      return Promise.reject(this.helpers.buildHttpErrorFromDavResponse(result.status, result.body))
    })
  }

  /**
   * Deletes a remote file or directory in a public folder
   * @param  {string}            token      public share token - may contain the path as well
   * @param  {string|null}       path       path of the folder to be created at OC instance
   * @param  {string|null}       password
   * @return {Promise.<status>}    boolean: whether the operation was successful
   * @return {Promise.<error>}     string: error message, if any.
   */
  delete (token, path = null, password = null) {
    let headers = this.helpers.buildHeaders(false)
    const url = this.getFileUrl(token, path)

    if (password) {
      headers['authorization'] = 'Basic ' + Buffer.from('public:' + password).toString('base64')
    }

    return this.davClient.request('DELETE', url, headers).then(result => {
      if ([200, 201, 204, 207].indexOf(result.status) > -1) {
        return Promise.resolve(true)
      } else {
        return Promise.reject(this.helpers.buildHttpErrorFromDavResponse(result.status, result.body))
      }
    })
  }

  /**
   * Write data into a remote file
   * @param  {string}            token      public share token - may contain the path as well
   * @param  {string|null}       path       path of the folder to be created at OC instance
   * @param  {string|null}       password
   * @param  {string} content    content to be put
   * @param  {Object} options
   * @param  {Object} [options.headers] optional extra headers
   * @param  {boolean} [options.overwrite] whether to force-overwrite the target
   * @param  {String} [options.previousEntityTag] previous entity tag to avoid concurrent overwrites
   * @param  {Function} options.onProgress progress callback
   * @return {Promise.<status>}  boolean: whether the operation was successful
   * @return {Promise.<error>}   string: error message, if any.
   */
  putFileContents (token, path = null, password = null, content = '', options = {}) {
    const headers = Object.assign({}, this.helpers.buildHeaders(), options.headers)
    const url = this.getFileUrl(token, path)

    if (password) {
      headers['authorization'] = 'Basic ' + Buffer.from('public:' + password).toString('base64')
    }
    const previousEntityTag = options.previousEntityTag || false
    if (previousEntityTag) {
      // will ensure that no other client uploaded a different version meanwhile
      headers['If-Match'] = previousEntityTag
    } else if (!options.overwrite) {
      // will trigger 412 precondition failed if a file already exists
      headers['If-None-Match'] = '*'
    }

    let requestOptions = {}
    if (options.onProgress) {
      requestOptions.onProgress = options.onProgress
    }
    return this.davClient.request('PUT', url, headers, content, null, requestOptions).then(result => {
      if ([200, 201, 204, 207].indexOf(result.status) > -1) {
        return Promise.resolve({
          'ETag': result.xhr.getResponseHeader('etag'),
          'OC-FileId': result.xhr.getResponseHeader('oc-fileid')
        })
      } else {
        return Promise.reject(this.helpers.buildHttpErrorFromDavResponse(result.status, result.body))
      }
    })
  }

  /**
   * Moves a remote file or directory
   * @param  {string} source     initial path of file/folder - including the token aka root folder
   * @param  {string} target     path where to move file/folder finally - including the token aka root folder
   * @param  {string|null}       password
   * @return {Promise.<status>}  boolean: whether the operation was successful
   * @return {Promise.<error>}   string: error message, if any.
   */
  move (source, target, password = null) {
    let headers = this.helpers.buildHeaders(false)
    const sourceUrl = this.getFileUrl(source)
    const targetUrl = this.getFileUrl(target)

    if (password) {
      headers['authorization'] = 'Basic ' + Buffer.from('public:' + password).toString('base64')
    }
    headers['Destination'] = targetUrl
    return this.davClient.request('MOVE', sourceUrl, headers).then(result => {
      if ([200, 201, 204, 207].indexOf(result.status) > -1) {
        return Promise.resolve(true)
      }
      return Promise.reject(this.helpers.buildHttpErrorFromDavResponse(result.status, result.body))
    })
  }

  /**
   * Copies a remote file or directory
   * @param  {string} source     initial path of file/folder - including the token aka root folder
   * @param  {string} target     path where to copy file/folder finally - including the token aka root folder
   * @param  {string|null}       password
   * @return {Promise.<status>}  boolean: whether the operation was successful
   * @return {Promise.<error>}   string: error message, if any.
   */
  copy (source, target, password = null) {
    let headers = this.helpers.buildHeaders(false)
    const sourceUrl = this.getFileUrl(source)
    const targetUrl = this.getFileUrl(target)

    if (password) {
      headers['authorization'] = 'Basic ' + Buffer.from('public:' + password).toString('base64')
    }
    headers['Destination'] = targetUrl
    return this.davClient.request('COPY', sourceUrl, headers).then(result => {
      if ([200, 201, 204, 207].indexOf(result.status) > -1) {
        return Promise.resolve(true)
      }
      return Promise.reject(this.helpers.buildHttpErrorFromDavResponse(result.status, result.body))
    })
  }
}
module.exports = PublicFiles
