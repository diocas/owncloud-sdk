const Promise = require('promise')
const HelperFile = require('./webdav/helperFunctions')
const Apps = require('./webdav/appManagement')
const Shares = require('./webdav/shareManagement')
const Users = require('./webdav/userManagement')
const Groups = require('./webdav/groupManagement')
const Files = require('./webdav/fileManagement')
const FileVersion = require('./webdav/fileVersionManagement')
const SystemTags = require('./webdav/systemTags')
const FilesTrash = require('./webdav/filesTrash')
const PublicFiles = require('./webdav/publicLinkAccess')

const Reva = require('./grpc/reva')
const FilesGrpc = require('./grpc/fileManagement')

/**
 * @class ownCloud
 * @classdesc
 * <b><i> The ownCloud class, the main class which holds all other classes like shares, apps etc.</i></b><br><br>
 * Supported Methods are:
 * <ul>
 *  <li><b>General</b>
 *      <ul>
 *          <li>init</li>
 *          <li>login</li>
 *          <li>logout</li>
 *          <li>getConfig</li>
 *          <li>getCapabilities</li>
 *          <li>getCurrentUser</li>
 *      </ul>
 *  </li>
 * </ul>
 *
 * @author Noveen Sachdeva
 * @version 1.0.0
 * @param {object}  options   additional options
 */
class ownCloud {
  constructor (options = {}) {
    this.init(options)
  }

  init (options) {
    let baseUrl = ''
    if (options.baseUrl) {
      baseUrl = new URL(options.baseUrl).href
    }

    // webdav

    let helpers = new HelperFile()
    helpers.setInstance(baseUrl)
    if (options.auth) {
      if (options.auth.bearer) {
        helpers.setAuthorization('Bearer ' + options.auth.bearer)
      }
      if (options.auth.basic) {
        const basicAuth = 'Basic ' + Buffer.from(options.auth.basic.username + ':' + options.auth.basic.password).toString('base64')
        helpers.setAuthorization(basicAuth)
      }
    }
    if (options.userInfo) {
      helpers.setCurrentUser(options.userInfo)
    }
    if (options.headers) {
      helpers.setHeaders(options.headers)
    }

    this.helpers = helpers
    this.apps = new Apps(this.helpers)
    this.shares = new Shares(this.helpers)
    this.users = new Users(this.helpers)
    this.groups = new Groups(this.helpers)
    this.fileVersions = new FileVersion(this.helpers)
    this.systemTags = new SystemTags(this.helpers)
    this.fileTrash = new FilesTrash(this.helpers)
    this.publicFiles = new PublicFiles(this.helpers)
    this.requests = {
      ocs: function (options = {}) {
        return helpers.ocs(options)
      }
    }

    // REVA/GRPC
    if (options.connector && options.connector.type &&
        options.connector.type === 'grpc') {
      this.reva = new Reva(options)
      this.files = new FilesGrpc(this.reva)
    } else {
      // TODO move the rest in here
      this.files = new Files(this.helpers)
    }
  }

  /**
   * Logs in to the specified ownCloud instance (Updates capabilities)
   * @returns {Promise.<status>}    boolean: whether login was successful or not
   * @returns {Promise.<error>}     string: error message, if any.
   */
  login () {
    const self = this
    return this.helpers.getCapabilities()
      .then(() => {
        return Promise.resolve(self.getCurrentUser())
      })
  }

  logout () {
    this.helpers.logout()
  }

  /**
   * Returns ownCloud config information
   * @returns {Promise.<configs>} object: {"version" : "1.7", "website" : "ownCloud" etc...}
   * @returns {Promise.<error>}     string: error message, if any.
   */
  getConfig () {
    return this.helpers._makeOCSrequest('GET', '', 'config')
      .then(data => {
        return Promise.resolve(data.data.ocs.data)
      })
  }

  /**
   * Gets the ownCloud app capabilities
   * @returns {Promise.<capabilities>}    string: ownCloud version
   * @returns {Promise.<reject>}             object: capabilities
   */
  getCapabilities () {
    return this.helpers.getCapabilities()
  }

  /**
   * Gets the currently logged in user
   * @returns {Promise.<user>}
   * @returns {Promise.<reject>}
   */
  getCurrentUser () {
    return this.helpers.getCurrentUserAsync()
  }
}

module.exports = ownCloud
