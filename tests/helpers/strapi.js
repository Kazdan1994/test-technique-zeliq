const Strapi = require('@strapi/strapi');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const { ApplicationError } = require('@strapi/utils').errors;
const { faker } = require('@faker-js/faker');

let instance;

/**
 * Setups strapi for further testing
 */
async function setupStrapi() {
  if (!instance) {
    await Strapi().load();
    instance = strapi;

    await instance.server.mount();
  }
  return instance;
}

/**
 * Closes strapi after testing
 */
async function stopStrapi() {
  const dbSettings = strapi.config.get('database.connection');

  //close server to release the db-file
  await strapi.server.httpServer.close();

  // close the connection to the database before deletion
  await strapi.db.connection.destroy();

  //delete test database after all tests have completed
  if (
    dbSettings &&
    dbSettings.connection &&
    dbSettings.connection.filename
  ) {
    const tmpDbFile = dbSettings.connection.filename;
    if (fs.existsSync(tmpDbFile)) {
      fs.unlinkSync(tmpDbFile);
    }
  }
}

/**
 * Returns valid JWT token for authenticated
 * @param idOrEmail
 */
const jwt = (idOrEmail) =>
  strapi.plugins['users-permissions'].services.jwt.issue({
    [Number.isInteger(idOrEmail) ? 'id' : 'email']: idOrEmail,
  });

/**
 * Grants database `permissions` table that role can access an endpoint/controllers
 *
 * @param roleID
 * @param {string} path
 * @param enabled
 * @param policy
 */
const grantPrivilege = async (
  roleID = 1,
  path,
  enabled = true,
  policy = ''
) => {
  const service = strapi.plugin('users-permissions').service('role');

  const role = await service.findOne(roleID);

  _.set(role.permissions, path, { enabled, policy });

  return service.updateRole(roleID, role);
};

/** Updates database `permissions` that role can access an endpoint
 * @see grantPrivilege
 */

const grantPrivileges = async (roleID = 1, values = []) => {
  await Promise.all(values.map((val) => grantPrivilege(roleID, val)));
};

/**
 * Updates the core of strapi
 * @param {*} pluginName
 * @param {*} key
 * @param {*} newValues
 * @param {*} environment
 */
const updatePluginStore = async (
  pluginName,
  key,
  newValues,
  environment = ''
) => {
  const pluginStore = strapi.store({
    environment: environment,
    type: 'plugin',
    name: pluginName,
  });

  const oldValues = await pluginStore.get({ key });
  const newValue = Object.assign({}, oldValues, newValues);

  return pluginStore.set({ key: key, value: newValue });
};

/**
 * Get plugin settings from store
 * @param {*} pluginName
 * @param {*} key
 * @param {*} environment
 */
const getPluginStore = (pluginName, key, environment = '') => {
  const pluginStore = strapi.store({
    environment: environment,
    type: 'plugin',
    name: pluginName,
  });

  return pluginStore.get({ key });
};

/**
 * Check if response error contains error with given ID
 * @param {string} errorId ID of given error
 * @param {object} response Response object from strapi controller
 * @example
 *
 * const response =  {
      data: null,
      error: {
        status: 400,
        name: 'ApplicationError',
        message: 'Your account email is not confirmed',
        details: {}
      }
    }
 * responseHasError("ApplicationError", response) // true
 */
const responseHasError = (errorId, response) => {
  return (
    response && response.error && response.error.name === errorId
  );
};

/**
 * Default data that factory use
 */
const defaultData = {
  password: '1234Abc',
  provider: 'local',
  confirmed: true,
};

/**
 * Returns random username object for user creation
 * @param {object} options that overwrites default options
 * @returns {object} object that is used with `strapi.plugins["users-permissions"].services.user.add`
 */
const mockUserData = (options = {}) => {
  const firstname = faker.person.firstName();
  const lastname = faker.person.lastName();

  return {
    username: `${firstname} ${lastname}`,
    email: faker.internet.email().toLowerCase(),
    firstname,
    lastname,
    ...defaultData,
    ...options,
  };
};

/**
 * Creates new user in strapi database
 * @param data
 * @returns {object} object of new created user, fetched from database
 */
const createUser = async (data) => {
  /** Gets the default user role */
  const pluginStore = await strapi.store({
    type: 'plugin',
    name: 'users-permissions',
  });

  const settings = await pluginStore.get({
    key: 'advanced',
  });

  const defaultRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: settings.default_role } });

  /** Creates a new user and push to database */
  return strapi
    .plugin('users-permissions')
    .service('user')
    .add({
      ...mockUserData(),
      ...data,
      role: defaultRole ? defaultRole.id : null,
    });
};

const createCar = async (data) => {
  return strapi.query('api::car.car').create({
    data: {
      start: new Date(),
      end: faker.date.future(),
      ...data,
    },
  });
};

const uploadFolderPath = path.resolve(
  __dirname,
  '../../public/uploads'
);

class TestError extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'TestError';
    this.message = message || 'Test failed.';
  }
}

module.exports = {
  setupStrapi,
  stopStrapi,
  jwt,
  grantPrivilege,
  grantPrivileges,
  updatePluginStore,
  getPluginStore,
  responseHasError,
  createUser,
  mockUserData,
  uploadFolderPath,
  TestError,
  createCar,
};
