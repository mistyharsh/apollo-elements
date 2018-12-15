import isFunction from 'crocks/predicates/isFunction';

import { ApolloElementMixin } from './apollo-element-mixin.js';
import hasAllVariables from '../lib/has-all-variables.js';
import isValidGql from '../lib/is-valid-gql.js';

/**
 * `ApolloSubscriptionMixin`: class mixin for apollo-subscription elements.
 *
 * @mixinFunction
 * @appliesMixin ApolloElementMixin
 *
 * @param {class} superclass
 * @return {class}
 */
export const ApolloSubscriptionMixin = superclass => class extends ApolloElementMixin(superclass) {
  /**
   * A GraphQL document that consists of a single subscription.
   * @type {DocumentNode|null}
   */
  get subscription() {
    return this.document;
  }

  set subscription(query) {
    try {
      this.document = query;
    } catch (error) {
      throw new TypeError('Subscription must be a gql-parsed document');
    }

    if (query) this.subscribe();
  }

  /**
   * An object map from variable name to variable value, where the variables are used within the GraphQL subscription.
   * @type {Object}
   */
  get variables() {
    return this.__variables;
  }

  set variables(variables) {
    this.__variables = variables;
    if (this.observableQuery) this.setVariables(variables);
    else this.subscribe();
  }

  /**
   * Exposes the [`ObservableQuery#setOptions`](https://www.apollographql.com/docs/react/api/apollo-client.html#ObservableQuery.setOptions) method.
   * @type {ModifiableWatchQueryOptions} options [options](https://www.apollographql.com/docs/react/api/apollo-client.html#ModifiableWatchQueryOptions) object.
   */
  get options() {
    return this.__options;
  }

  set options(options) {
    this.__options = options;
    this.observableQuery && this.observableQuery.setOptions(options);
  }

  constructor() {
    super();
    this.nextData = this.nextData.bind(this);
    this.nextError = this.nextError.bind(this);

    /**
     * Specifies the FetchPolicy to be used for this subscription.
     * @type {FetchPolicy}
     */
    this.fetchPolicy = 'cache-first';

    /**
     * Whether or not to fetch results.
     * @type {Boolean}
     */
    this.fetchResults = undefined;

    /**
     * The time interval (in milliseconds) on which this subscription should be refetched from the server.
     * @type {Number}
     */
    this.pollInterval = undefined;

    /**
     * Whether or not updates to the network status should trigger next on the observer of this subscription.
     * @type {Boolean}
     */
    this.notifyOnNetworkStatusChange = undefined;

    /**
     * Variables used in the subscription.
     * @type {Object}
     */
    this.variables = undefined;

    /**
     * Apollo Subscription Object.
     * e.g. gql`
     * subscription MySubscription {
     *   mySubscription {
     *     foo
     *   }
     * `
     * @type {DocumentNode}
     */
    this.subscription = null;

    /**
     * Try and fetch new results even if the variables haven't changed (we may still just hit the store, but if there's nothing in there will refetch).
     * @type {Boolean}
     */
    this.tryFetch = undefined;

    /**
     * The apollo ObservableQuery watching this element's subscription.
     * @type {Observable}
     */
    this.observableQuery;
  }

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    this.subscribe();
  }

  /**
   * Resets the observableQuery and subscribes.
   * @param  {Object} options
   * @param  {FetchPolicy}                [options.fetchPolicy=this.fetchPolicy]
   * @param  {DocumentNode}               [options.query=this.subscription]
   * @param  {Object}                     [options.variables=this.variables]
   * @return {Observable.Subscription}
   */
  async subscribe({
    fetchPolicy = this.fetchPolicy,
    query = this.subscription,
    variables = this.variables,
  } = {}) {
    if (!hasAllVariables({ query, variables })) return;
    this.observableQuery = this.client.subscribe({ query, variables, fetchPolicy });
    return this.observableQuery.subscribe({
      next: this.nextData,
      error: this.nextError,
    });
  }

  /**
   * Updates the element with the result of a subscription.
   * @param  {ApolloQueryResult} result The result of the subscription.
   * @param  {Object}  result.data          The data from the subscription.
   * @param  {Boolean} result.loading       Whether the subscription is loading.
   * @protected
   */
  nextData({ data }) {
    const { client, onSubscriptionData } = this;
    if (isFunction(onSubscriptionData)) onSubscriptionData({ client, subscriptionData: { data } });
    this.data = data;
    this.loading = false;
    this.error = undefined;
  }

  /**
   * Updates the element with the error when the subscription fails.
   * @param  {Error} error
   * @protected
   */
  nextError(error) {
    this.error = error;
    this.loading = false;
  }
};