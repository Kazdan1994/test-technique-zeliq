const { describe, beforeEach, it, expect } = require('@jest/globals');
const request = require('supertest');
const { createUser, createCar } = require('./../../helpers/strapi');
const { grantPrivilege } = require('../../helpers/strapi');

describe('Default Booking methods', () => {
  let user;
  let user2;
  let car;

  beforeEach(async () => {
    user = await createUser();
    user2 = await createUser();
    car = await createCar();
  });

  it('should create a booking', async () => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const jwt = strapi.plugins[
      'users-permissions'
    ].services.jwt.issue({
      id: user.id,
    });

    await grantPrivilege(
      1,
      'api::booking.controllers.booking.create'
    );

    await request(strapi.server.httpServer)
      .post('/api/bookings')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer ' + jwt)
      .send({
        data: {
          start,
          end,
          car: car.id,
        },
      })
      .then(async (data) => {
        expect(data.body).toMatchObject({
          data: {
            id: expect.any(Number),
            attributes: {
              status: 'Pending',
              start: expect.stringMatching(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
              ),
              end: expect.stringMatching(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
              ),
              title: 'Car rental',
            },
          },
          meta: {},
        });
      });
  });

  it('should not validate a booking with start is after end', async () => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const jwt = strapi.plugins[
      'users-permissions'
    ].services.jwt.issue({
      id: user.id,
    });

    await grantPrivilege(
      1,
      'api::booking.controllers.booking.create'
    );

    await request(strapi.server.httpServer)
      .post('/api/bookings')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer ' + jwt)
      .send({
        data: {
          start: end,
          end: start,
          car: car.id,
        },
      })
      .then(async (data) => {
        expect(data.body).toHaveProperty('error');
        expect(data.body.error.message).toBe(
          'start date must be before end date'
        );
      });
  });

  it('should be a user for a booking', async () => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const jwt = strapi.plugins[
      'users-permissions'
    ].services.jwt.issue({
      id: user.id,
    });

    await grantPrivilege(
      1,
      'api::booking.controllers.booking.create'
    );

    await request(strapi.server.httpServer)
      .post('/api/bookings')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer ' + jwt)
      .send({
        data: {
          start,
          end,
          car: car.id,
        },
      });

    const booking = await strapi
      .query('api::booking.booking')
      .findOne({
        populate: ['user'],
      });

    expect(booking.user).toBeDefined();
    expect(booking.user.id).toBe(user.id);
  });

  it('should not be possible for a user to book a car already booked', async () => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const jwt = strapi.plugins[
      'users-permissions'
    ].services.jwt.issue({
      id: user2.id,
    });

    await strapi.entityService.create('api::booking.booking', {
      data: { start, end, car: car.id, user: user.id },
    });

    await grantPrivilege(
      1,
      'api::booking.controllers.booking.create'
    );

    await request(strapi.server.httpServer)
      .post('/api/bookings')
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer ' + jwt)
      .send({
        data: {
          start,
          end,
          car: car.id,
        },
      })
      .then(async (data) => {
        expect(data.body).toHaveProperty('error');
        expect(data.body.error.message).toBe(
          'Car is already booked for the given date range'
        );
      });
  });

  it('should be possible for a user to modify his booking', async () => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const jwt = strapi.plugins[
      'users-permissions'
    ].services.jwt.issue({
      id: user.id,
    });

    const booking = await strapi.entityService.create(
      'api::booking.booking',
      {
        data: { start, end, car: car.id, user: user.id },
      }
    );

    await grantPrivilege(
      1,
      'api::booking.controllers.booking.update'
    );

    start.setDate(start.getDate() + 7);
    end.setDate(end.getDate() + 7);

    await request(strapi.server.httpServer)
      .put(`/api/bookings/${booking.id}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer ' + jwt)
      .send({
        data: {
          start,
          end,
        },
      })
      .then(async (data) => {
        expect(data.body).toMatchObject({
          data: {
            id: expect.any(Number),
            attributes: {
              status: 'Pending',
              start: start.toISOString(),
              end: end.toISOString(),
              title: 'Car rental',
            },
          },
          meta: {},
        });
      });
  });

  it('should not be possible for a user to modify his booking if another user booking exist on new dates', async () => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const jwt = strapi.plugins[
      'users-permissions'
    ].services.jwt.issue({
      id: user.id,
    });

    const booking = await strapi.entityService.create(
      'api::booking.booking',
      {
        data: { start, end, car: car.id, user: user.id },
      }
    );

    start.setDate(start.getDate() + 7);
    end.setDate(end.getDate() + 7);

    await strapi.entityService.create('api::booking.booking', {
      data: {
        start,
        end,
        car: car.id,
        user: user2.id,
      },
    });

    await grantPrivilege(
      1,
      'api::booking.controllers.booking.update'
    );

    await request(strapi.server.httpServer)
      .put(`/api/bookings/${booking.id}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer ' + jwt)
      .send({
        data: {
          start,
          end,
        },
      })
      .then(async (data) => {
        expect(data.body).toHaveProperty('error');
        expect(data.body.error.message).toBe(
          'Car is already booked for the given date range'
        );
      });
  });

  it('should be possible for a user to cancel his booking', async () => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const jwt = strapi.plugins[
      'users-permissions'
    ].services.jwt.issue({
      id: user.id,
    });

    const booking = await strapi.entityService.create(
      'api::booking.booking',
      {
        data: { start, end, car: car.id, user: user.id },
      }
    );

    expect(booking.status).toBe('Pending');

    await grantPrivilege(
      1,
      'api::booking.controllers.booking.update'
    );

    await request(strapi.server.httpServer)
      .put(`/api/bookings/${booking.id}`)
      .set('accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer ' + jwt)
      .send({
        data: {
          status: 'Cancelled',
        },
      })
      .then(async (data) => {
        expect(data.body.data.attributes.status).toBe('Cancelled');
      });
  });
});
