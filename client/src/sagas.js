import { takeLatest, call, put } from "redux-saga/effects";

// watcher saga: watches for actions dispatched to the store, starts worker saga
export function* watcherSaga() {
    yield takeLatest("API_CALL_REQUEST", workerSaga);
}

// function that makes the api request and returns a Promise for response
async function fetchDog() {
    const response = await fetch('https://dog.ceo/api/breeds/image/random');
    return response.json();
}

// worker saga: makes the api call when watcher saga sees the action
function* workerSaga() {
    try {
        const response = yield call(fetchDog);
        const dog = response.message;

        // dispatch a success action to the store with the new dog
        yield put({ type: "API_CALL_SUCCESS", dog });

    } catch (error) {
        // dispatch a failure action to the store with the error
        yield put({ type: "API_CALL_FAILURE", error });
    }
}
