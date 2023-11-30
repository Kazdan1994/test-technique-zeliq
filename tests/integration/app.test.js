'use strict';

const {
  jest: requiredJest,
  beforeAll,
  afterAll,
  it,
  expect,
  afterEach,
} = require('@jest/globals');
const {
  setupStrapi,
  stopStrapi,
  uploadFolderPath,
} = require('../helpers/strapi');
const { readdirSync, rmSync } = require('fs');

requiredJest.setTimeout(300000);

const collections = ['booking', 'car'];

/** this code is called once before any test is called */
beforeAll(async () => {
  await setupStrapi();
});

/** this code is called once before all the tested are finished */
afterAll(async () => {
  await stopStrapi();
});

afterEach(async () => {
  for (const collection of collections) {
    await strapi
      .query(`api::${collection}.${collection}`)
      .deleteMany();
  }
  await strapi.query('plugin::users-permissions.user').deleteMany();

  readdirSync(uploadFolderPath).forEach((file) => {
    if (file[0] !== '.') {
      rmSync(`${uploadFolderPath}/${file}`);
    }
  });
});

it('strapi is defined', (done) => {
  expect(strapi).toBeDefined();
  done();
});

require('./user');
require('./booking');
