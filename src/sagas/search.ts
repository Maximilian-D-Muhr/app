import { push, replace, LOCATION_CHANGED } from '@mraerino/redux-little-router-reactless';
import { delay } from 'redux-saga';
import { call, cancel, put, select, take, takeEvery, takeLatest } from 'redux-saga/effects';

import { Types } from '../actions';
import { updateMetadata } from '../actions/metadata';
import { searchFail, searchFinish, searchStart, ChangeTrackSearchInputAction } from '../actions/view-party';
import { State, Track } from '../state';
import { fetchWithAnonymousAuth } from '../util/spotify-auth';

function* doSearch(action) {
    const { params: {partyId}, query: {s} } = action.payload || { params: {partyId: ''}, query: {s: ''} };
    if (!partyId || !s) {
        return;
    }

    yield put(searchStart());
    yield call(delay, 500);

    const { party: { currentParty } }: State = yield select();
    const url =
        `/search?type=track&limit=${20}&market=${currentParty!.country}` +
        `&q=${encodeURIComponent(s.replace('-', ' ') + '*')}`;

    let tracks: SpotifyApi.TrackObjectFull[];
    try {
        const trackResponse = yield call(fetchWithAnonymousAuth, url);
        tracks = (yield trackResponse.json()).tracks.items;
    } catch (e) {
        yield put(searchFail(e));
        return;
    }

    const result = tracks.reduce((acc, track, i) => {
        acc[`spotify-${track.id}`] = {
            added_at: Date.now(),
            is_fallback: false,
            order: i,
            reference: {
                provider: 'spotify',
                id: track.id,
            },
            vote_count: 0,
        } as Track;
        return acc;
    }, {});

    yield put(updateMetadata(tracks));
    yield put(searchFinish(result));
}

function* updateUrl(action: ChangeTrackSearchInputAction) {
    const { router }: State = yield select();
    const { params: {partyId}, query: {s} } = router || { params: {partyId: ''}, query: {s: ''} };

    if (!partyId) {
        throw new Error("Searching without party!");
    }

    if (!action.payload) {
        yield put(push(`/party/${partyId}`, {}));
        return;
    }

    // Replace URL if we already have an incomplete query to avoid clobbing
    // up the users browser history.
    const routerFn = s ? replace : push;
    yield put(routerFn(`/party/${partyId}/search?s=${encodeURIComponent(action.payload)}`, {}));
}

export default function*() {
    while (true) {
        // Ensure we have a party before searching
        yield take(Types.UPDATE_PARTY);

        const search = yield takeLatest(LOCATION_CHANGED, doSearch);
        const url = yield takeEvery(Types.CHANGE_TRACK_SEARCH_INPUT, updateUrl);

        yield take(Types.CLEANUP_PARTY);

        // Stop listening for URL updates when party is left
        yield cancel(search);
        yield cancel(url);
    }
}
