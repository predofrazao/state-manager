// @ts-check

class StateManager {
  #_DEFAULT_STORAGE_KEY = "gfsislc_state_manager";
  #_STATE_CHANGE_CUSTOM_EVENT = "_state_manager_state_change";

  constructor() {
    /**
     * @type {[string[], any][]}
     */
    this.states = [];

    /**
     * @type {[string[], (state: unknown) => void][]}
     */
    this.stateListeners = [];

    this.#_defineWindowListener();
    return this;
  }

  /**
   * @param {any} defaultValue
   * @param {string[]} key
   * @param {boolean} [persist]
   */
  create(defaultValue, key, persist) {
    if (!key.length) {
      throw new Error("key should be a non-empty array of string.");
    }

    const _indexPosition = this.states.length > 0 ? this.states.length - 1 : 0;

    const getValue = () => {
      return this.states[_indexPosition][1];
    };

    /**
     * @param {(currentValue: typeof defaultValue) => typeof defaultValue} newState
     */
    const setValue = (newState) => {
      const _newState = newState(this.states[_indexPosition]?.[1] ?? null);

      if (this.states[_indexPosition]) {
        this.states[_indexPosition][1] = _newState;
      } else {
        this.states.push([key, _newState]);
      }

      if (persist) {
        if (!key) {
          throw new Error("key must be provided to persist this state.");
        }

        this.#_persistState(key, _newState);
      }

      this.#_dispatchChangeEvent(key, _newState);
    };

    setValue(() => defaultValue);

    return [getValue, setValue];
  }

  /**
   * @param {string[]} key
   */
  get = (key) => {
    return this.#_getPersistedState(key);
  };

  /**
   * @param {string[]} key
   * @param {(state: unknown) => void} callback
   */
  listen = (key, callback) => {
    this.stateListeners.push([key, callback]);
  };

  /* --------------- */
  /* Private Methods */

  /*
   * @param {string[]} key
   * @param {unknown} state
   */
  #_dispatchChangeEvent(key, state) {
    const _customEvent = new CustomEvent(this.#_STATE_CHANGE_CUSTOM_EVENT, {
      detail: [key, state],
    });

    window.dispatchEvent(_customEvent);
  }

  /**
   * @returns [string[], any]
   */
  #_getAllCachedStates = () => {
    const _cachedData = window.sessionStorage.getItem(this.#_DEFAULT_STORAGE_KEY);

    if (_cachedData) {
      return JSON.parse(_cachedData);
    } else {
      return [];
    }
  };

  /**
   * @param {string[]} key
   */
  #_getPersistedState = (key) => {
    const _filteredCachedStates = this.#_getAllCachedStates().filter(([cachedStateKey]) => {
      for (let i = 0; i < key.length; i++) {
        if (cachedStateKey[i] !== key[i]) {
          return false;
        }
      }

      return true;
    });

    return _filteredCachedStates.map(([, cachedState]) => cachedState);
  };

  /**
   * @param {string[]} key1
   * @param {string[]} key2
   */
  #_checkKeyEquality = (key1, key2) => {
    if (key1.length !== key2.length) {
      return false;
    }

    for (let i = 0; i < key1.length; i++) {
      if (key1[i] !== key2[i]) {
        return false;
      }
    }

    return true;
  };

  /**
   * @param {string[]} key
   * @param {[string[], any]} [allCachedStates]
   */
  #_findAlreadyCachedIndex = (key, allCachedStates) => {
    /**
     * @type {[string[]]} _allCachedStatesKeys
     */
    const _allCachedStatesKeys = (allCachedStates ?? this.#_getAllCachedStates()).map(
      ([cachedStatesKeys]) => cachedStatesKeys
    );

    return _allCachedStatesKeys.findIndex((cachedStateKey) =>
      this.#_checkKeyEquality(cachedStateKey, key)
    );
  };

  /**
   * @param {number} index
   * @param {any} newState
   * @param {[string[], any]} [allCachedStates]
   */
  #_replaceCachedState = (index, newState, allCachedStates) => {
    const _allCachedStates = allCachedStates ?? this.#_getAllCachedStates();
    _allCachedStates[index][1] = newState;
    window.sessionStorage.setItem(
      this.#_DEFAULT_STORAGE_KEY,
      JSON.stringify([..._allCachedStates])
    );
  };

  /**
   * @param {string[]} key
   * @param {any} state
   */
  #_persistState = (key, state) => {
    const _allCachedStates = this.#_getAllCachedStates();

    const _stateCacheIndex = this.#_findAlreadyCachedIndex(key, _allCachedStates);
    if (_stateCacheIndex !== -1) {
      this.#_replaceCachedState(_stateCacheIndex, state);
      return;
    }

    const _data = [key, state];
    window.sessionStorage.setItem(
      this.#_DEFAULT_STORAGE_KEY,
      JSON.stringify([..._allCachedStates, _data])
    );
  };

  #_defineWindowListener() {
    window.addEventListener(
      this.#_STATE_CHANGE_CUSTOM_EVENT,
      // @ts-ignore
      ({ detail: [eventStateKey, eventStateData] }) => {
        this.stateListeners.forEach(
          ([listenerKey, listenerCallback]) =>
            this.#_checkKeyEquality(eventStateKey, listenerKey) && listenerCallback(eventStateData)
        );
      }
    );
  }
}

export const State = new StateManager();
