/*
 * Ensures that error is reported when overlappping range is submitted for deletion.
 * @tags: [multiversion_incompatible]
 */

(function() {
"use strict";

load("jstests/libs/uuid_util.js");

const dbName = "test";
const collName = "foo";
const ns = dbName + "." + collName;

// Create 2 shards with 3 replicas each.
let st = new ShardingTest({shards: {rs0: {nodes: 3}, rs1: {nodes: 3}}});

(() => {
    jsTestLog("Test simple shard key");

    // Create a sharded collection with one chunk and a single-field shard key.
    assert.commandWorked(st.s.adminCommand({enableSharding: dbName}));
    assert.commandWorked(st.s.adminCommand({movePrimary: dbName, to: st.shard0.shardName}));
    assert.commandWorked(st.s.adminCommand({shardCollection: ns, key: {x: 1}}));

    // Pause range deletion on shard0.
    let suspendRangeDeletionFailpoint = configureFailPoint(st.shard0, "suspendRangeDeletion");

    // Move the only chunk from shard0 to shard1. This will leave orphans on shard0 since we paused
    // range deletion.
    assert.commandWorked(
        st.s.adminCommand({moveChunk: ns, find: {x: 50}, to: st.shard1.shardName}));

    // Move the only chunk back to shard0 and expect timeout failure, since range deletion was
    // paused and there are orphans on shard0.
    assert.commandFailedWithCode(
        st.s.adminCommand({moveChunk: ns, find: {x: 50}, to: st.shard0.shardName, maxTimeMS: 5000}),
        ErrorCodes.MaxTimeMSExpired);

    suspendRangeDeletionFailpoint.off();

    st.s.getCollection(ns).drop();
})();

(() => {
    jsTestLog("Test hashed shard key");

    // Create a sharded collection with one chunk and a hashed shard key.
    assert.commandWorked(st.s.adminCommand({enableSharding: dbName}));
    assert.commandWorked(st.s.adminCommand({movePrimary: dbName, to: st.shard0.shardName}));
    assert.commandWorked(st.s.adminCommand({shardCollection: ns, key: {x: 'hashed'}}));

    // Pause range deletion on shard0.
    let suspendRangeDeletionFailpoint = configureFailPoint(st.shard0, "suspendRangeDeletion");

    // Move the only chunk from shard0 to shard1. This will leave orphans on shard0 since we paused
    // range deletion.
    assert.commandWorked(
        st.s.adminCommand({moveChunk: ns, find: {x: 50}, to: st.shard1.shardName}));

    // Move the only chunk back to shard0 and expect timeout failure, since range deletion was
    // paused and there are orphans on shard0.
    assert.commandFailedWithCode(
        st.s.adminCommand({moveChunk: ns, find: {x: 50}, to: st.shard0.shardName, maxTimeMS: 5000}),
        ErrorCodes.MaxTimeMSExpired);

    suspendRangeDeletionFailpoint.off();

    st.s.getCollection(ns).drop();
})();

(() => {
    jsTestLog("Test compound shard key");

    // Create a sharded collection with one chunk and a compound shard key.
    assert.commandWorked(st.s.adminCommand({enableSharding: dbName}));
    assert.commandWorked(st.s.adminCommand({movePrimary: dbName, to: st.shard0.shardName}));
    assert.commandWorked(st.s.adminCommand({shardCollection: ns, key: {x: 1, y: 1}}));

    // Pause range deletion on shard0.
    let suspendRangeDeletionFailpoint = configureFailPoint(st.shard0, "suspendRangeDeletion");

    // Move the only chunk from shard0 to shard1. This will leave orphans on shard0 since we paused
    // range deletion.
    assert.commandWorked(
        st.s.adminCommand({moveChunk: ns, find: {x: 50, y: 50}, to: st.shard1.shardName}));

    // Move the only chunk back to shard0 and expect timeout failure, since range deletion was
    // paused and there are orphans on shard0.
    assert.commandFailedWithCode(
        st.s.adminCommand(
            {moveChunk: ns, find: {x: 50, y: 50}, to: st.shard0.shardName, maxTimeMS: 5000}),
        ErrorCodes.MaxTimeMSExpired);

    suspendRangeDeletionFailpoint.off();

    st.s.getCollection(ns).drop();
})();

st.stop();
})();
