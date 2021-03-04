// @flow
import RootStore from "stores/RootStore";

let stores;

export function getStores() {
	return stores;
}

export function createStores() {
	stores = new RootStore();
	return stores;
}


export default stores;
