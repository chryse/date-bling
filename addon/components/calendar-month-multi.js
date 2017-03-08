import Ember from 'ember';
import layout from '../templates/components/calendar-month-multi';

const {
  computed,
  on
} = Ember;

const Month = Ember.Object.extend({
  /**
   * 1-indexed month
   * @type {number}
   */
  month: null,

  /**
   * 1-indexed year
   * @type {number}
   */
  year: null,

  /**
   * Show last partial week
   * If current month ends on a Tuesday, don't show this month on this calendar, but rather the next month
   * This should be true for the last month
   * @type {Boolean}
   */
  showLastPartialWeek: false
});

export default Ember.Component.extend({
  layout,
  classNames: ['calendar-month-multi'],

  /**
   * Start date
   * @todo test different formats (canonical, moment, js date)
   * @type {object|string}
   */
  startDate: null,

  /**
   * End date
   * @todo test different formats (canonical, moment, js date)
   * @type {object|string}
   */
  endDate: null,

  /**
   * Pass in anything that you will need in `customClassFunction`
   * @example
   * ```hbs
   * {{calendar-month-multi
   *    startDate=today
   *    endDate=threeMonthsFromNow
   *    context=(hash
   *      startDate=today
   *      endDate=threeMonthsFromNow
   *      daysIWantToExclude=daysIWantToExclude)
   *    customClassFunction=customClassFunction}}
   * ```
   *
   * ```js
   * customClassFunction(date) {
   *   const { startDate, endDate, daysIWantToExclude } = this.get('context');
   *   if (date.isSame(startDate, 'day')) {
   *     return 'start-date';
   *   }
   *
   *   if (date.isSame(endDate, 'day')) {
   *     return 'end-date';
   *   }
   *
   *   if (daysIWantToExclude.includes(date.day())) {
   *     // don't add a class to these days
   *     return;
   *   }
   *
   *   return 'selected';
   * }
   * ```
   * @type {object}
   */
  context: null,

  /**
   * Max months to show
   * @type {number}
   */
  maxMonthsToShow: 6,

  /**
   * Offset for displayMonths
   * @private
   * @type {number}
   */
  monthOffset: 0,

  _onDidReceiveAttrs: on('didReceiveAttrs', function() {
    // validate starDate and endDate are valid moment objects
    if (!moment.isMoment(this.get('startDate')) || !moment.isMoment(this.get('endDate'))) {
      this.setProperties({
        startDate: moment(this.get('startDate')),
        endDate: moment(this.get('endDate'))
      });
    }

    // validate validity of moments
    if (!this.get('startDate').isValid()) {
      throw new Error('Start date is invalid', this.get('startDate'));
    }

    if (!this.get('endDate').isValid()) {
      throw new Error('End date is invalid', this.get('endDate'));
    }

    // validate startDate is before endDate
    if (this.get('endDate').isBefore(this.get('startDate'))) {
      throw new Error('Start date must be before end date', this.get('startDate'), this.get('endDate'));
    }
  }),

  actions: {
    previous() {
      const currentOffset = this.get('monthOffset');
      this.set('monthOffset', currentOffset - this.get('maxMonthsToShow'));
    },

    next() {
      const currentOffset = this.get('monthOffset');
      this.set('monthOffset', currentOffset + this.get('maxMonthsToShow'));
    }
  },

  /**
   * Override this method in your controller
   * @param {object} date - moment date
   * @return {string} class name to be applied to this date
   */
  customClassFunction(date) {
    return false;
  },

  /**
   * Don't show duplicate end of last month/beginning of this month
   * If endDate - startDate = 2 months, still display 3 months (pad one on end)
   * If endDate - startDate > 6 mo, display "next" and "previous"
   * @type {array} array of months
   */
  displayMonths: computed('startDate', 'endDate', 'numberOfMonthsToDisplay', 'monthOffset', function() {
    var months = [];
    let current = moment(this.get('startDate')).add(this.get('monthOffset'), 'months');

    // if I enter 7/31/2017 (a Monday, so start of week) as startDate, that will be rendered in August since 8/1 is _not_ start of week. I shouldn't show July
    const firstWeekOfNextMonth = current.clone().add(1, 'month').startOf('month');
    if (current.isSame(firstWeekOfNextMonth, 'week')) {
      current.add(1, 'week');
    }

    for (let i = 0; i < this.get('numberOfMonthsToDisplay'); i++) {
        months.addObject(Month.create({
          // current.month() is 0-indexed, but calendar-month expects 1-indexed month
          month: current.month(),
          year: current.year(),
          showLastPartialWeek: (i === this.get('numberOfMonthsToDisplay') - 1)
        }));
        current.add(1, 'month');
    }

    return months;
  }),

  /**
   * T: first display month is after start date
   * F: first display month is same/before start date
   * @type {boolean}
   */
  shouldShowPreviousButton: computed('startDate', 'displayMonths.[]', function() {
    const firstMonth = this.get('displayMonths.firstObject.month');
    const firstMonthYear = this.get('displayMonths.firstObject.year');
    const firstDayOfFirstMonth = moment().month(firstMonth).year(firstMonthYear).startOf('month');
    return firstDayOfFirstMonth.isAfter(this.get('startDate'));
  }),

  /**
   * T: last display month is before end date
   * F: last display month is same/after end date
   * @type {boolean}
   */
  shouldShowNextButton: computed('endDate', 'displayMonths.[]', function() {
    const lastMonth = this.get('displayMonths.lastObject.month');
    const lastMonthYear = this.get('displayMonths.lastObject.year');
    const lastDayOfLastMonth = moment().month(lastMonth).year(lastMonthYear).endOf('month');
    return lastDayOfLastMonth.isBefore(this.get('endDate'));
  }),

  /**
   * The number of months between start and end date
   * @type {number}
   */
  numberOfMonthsBetweenStartAndEndDate: computed('startDate', 'endDate', function() {
    const startDate = moment(this.get('startDate'));
    const endDate = moment(this.get('endDate'));
    return endDate.diff(startDate, 'months');
  }),

  /**
   * The number of months to display
   * @type {number}
   */
  numberOfMonthsToDisplay: computed('startDate', 'endDate', 'maxMonthsToShow', function() {
    const numberOfMonthsBetweenStartAndEndDate = this.get('numberOfMonthsBetweenStartAndEndDate');
    const maxMonthsToShow = this.get('maxMonthsToShow');

    if (numberOfMonthsBetweenStartAndEndDate > maxMonthsToShow) {
      return maxMonthsToShow;
    }

    return numberOfMonthsBetweenStartAndEndDate + 1;
  })
});
