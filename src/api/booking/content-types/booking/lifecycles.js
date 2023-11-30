const { ValidationError } = require('@strapi/utils').errors;

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;

    if (
      new Date(data.start).getTime() > new Date(data.end).getTime()
    ) {
      throw new ValidationError('start date must be before end date');
    }
  },
};
