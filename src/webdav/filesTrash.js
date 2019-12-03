const Promise = require('promise')
const dav = require('davclient.js')
const WebdavProperties = require('./properties')

/**
 * @class FilesTrash
 * @classdesc
 * <b><i> The FilesTrash class has all the methods for ownCloud trash-bin management.</i></b><br><br>
 *
 * @version 1.0.0
 * @param   {helpers}    helperFile  instance of the helpers class
 */
class FilesTrash {
  constructor (helperFile) {
    this.helpers = helperFile
    this.davClient = new dav.Client({
      baseUrl: this.helpers._webdavUrl,
      xmlNamespaces: {
        'DAV:': 'd',
        'http://owncloud.org/ns': 'oc'
      }
    })
  }

  /**
   * Returns the listing/contents of the trash-bin
   * @param   {string}    path          path of the file/folder at OC instance
   * @param   {string}    depth         0: only file/folder, 1: upto 1 depth, infinity: infinite depth
   * @param   {array}     properties    Array[string] with dav properties to be requested
   * @returns {Promise.<File | string | Error>}
   */
  list (path, depth = '1') {
    if (!this.helpers.getAuthorization()) {
      return Promise.reject('Please specify an authorization first.')
    }

    const headers = this.helpers.buildHeaders()
    const target = '/trash-bin/' + this.helpers.getCurrentUser().id + '/' + path

    return this.davClient.propFind(this.helpers._buildFullWebDAVPathV2(target), WebdavProperties.TrashProperties, depth, headers).then(result => {
      if (result.status !== 207) {
        return Promise.reject(this.helpers.buildHttpErrorFromDavResponse(result.status, result.xhr.response))
      } else {
        return Promise.resolve(this.helpers._parseBody(result.body))
      }
    })
  }

  /**
   * Clears the users trash-bin
   * @param {?string} item
   * @returns {Promise<void | string | Error>}
   */
  clearTrashBin (item = null) {
    if (!this.helpers.getAuthorization()) {
      return Promise.reject('Please specify an authorization first.')
    }

    const headers = this.helpers.buildHeaders()
    let target = '/trash-bin/' + this.helpers.getCurrentUser().id + '/'
    if (item !== null) {
      target += item
    }

    return this.davClient.request('DELETE', this.helpers._buildFullWebDAVPathV2(target), headers).then(result => {
      if ([200, 201, 204, 207].indexOf(result.status) > -1) {
        return Promise.resolve()
      } else {
        return Promise.reject(this.helpers.buildHttpErrorFromDavResponse(result.status, result.xhr.response))
      }
    })
  }

  /**
   * Restores an item to it's original location.
   * @param {string|number}  fileId
   * @param {string}         originalLocation
   * @param {boolean}        overWrite
   * @returns {Promise<void | string | Error>}
   */
  restore (fileId, originalLocation, overWrite = false) {
    if (fileId === undefined) {
      return Promise.reject(new Error('No fileId given for restore'))
    }
    if (!this.helpers.getAuthorization()) {
      return Promise.reject('Please specify an authorization first.')
    }

    const headers = this.helpers.buildHeaders()
    const source = '/trash-bin/' + this.helpers.getCurrentUser().id + '/' + fileId
    const target = '/files/' + this.helpers.getCurrentUser().id + '/' + originalLocation

    headers['Destination'] = this.helpers._buildFullWebDAVPathV2(target)
    headers['Overwrite'] = overWrite ? 'T' : 'F'
    return this.davClient.request('MOVE', this.helpers._buildFullWebDAVPathV2(source), headers).then(result => {
      if ([200, 201, 204, 207].indexOf(result.status) > -1) {
        return Promise.resolve()
      } else {
        return Promise.reject(this.helpers.buildHttpErrorFromDavResponse(result.status, result.xhr.response))
      }
    })
  }
}

module.exports = FilesTrash
