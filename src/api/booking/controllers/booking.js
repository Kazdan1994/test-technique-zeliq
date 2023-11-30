'use strict';

/**
 * booking controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController(
  'api::booking.booking',
  ({ strapi }) => ({
    async create(ctx) {
      ctx.request.body.data = {
        ...ctx.request.body.data,
        user: ctx.state.user.id,
      };

      if (!ctx.request.body.data.car) {
        return ctx.badRequest('Car is not selected');
      }

      const existingBooking = await strapi
        .query('api::booking.booking')
        .findOne({
          where: {
            car: ctx.request.body.data.car,
            start: { $lt: ctx.request.body.data.end },
            end: { $gt: ctx.request.body.data.start },
          },
        });

      if (existingBooking) {
        return ctx.badRequest(
          'Car is already booked for the given date range'
        );
      }

      return super.create(ctx);
    },
    async update(ctx) {
      ctx.request.body.data.user = ctx.state.user.id;

      const { id } = ctx.params;

      const booking = await strapi
        .query('api::booking.booking')
        .findOne({
          where: { id, user: ctx.state.user.id },
          populate: ['car'],
        });

      if (!booking) {
        return ctx.badRequest('Booking does not exist');
      }

      if (
        ctx.request.body.data.status &&
        ctx.request.body.data.status !== 'Cancelled'
      ) {
        return ctx.badRequest(
          "You can't change your reservation status"
        );
      }

      // Extract the new start and end dates from the request body
      const { start, end } = ctx.request.body.data;

      // Check for overlaps only if both start and end dates are provided
      if (start && end) {
        // Check if the new date range overlaps with existing bookings for the same car
        const overlappingBooking = await strapi
          .query('api::booking.booking')
          .findOne({
            where: {
              car: booking.car.id,
              id: {
                $ne: id,
              }, // Exclude the current booking from the check
              start: { $lt: end },
              end: { $gt: start },
            },
          });

        if (overlappingBooking) {
          return ctx.badRequest(
            'Car is already booked for the given date range'
          );
        }
      }

      // Continue with the original update logic
      return super.update(ctx);
    },
  })
);
