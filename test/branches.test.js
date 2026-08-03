import test from 'node:test';
import assert from 'node:assert/strict';
import { BRANCHES, getBranch, getRank, searchRanks } from '../src/config/branches.js';

test('all six U.S. military branches are available', () => {
  assert.deepEqual(Object.keys(BRANCHES), [
    'army',
    'marine_corps',
    'navy',
    'air_force',
    'space_force',
    'coast_guard'
  ]);
});

test('every branch has a valid and unique rank library', () => {
  for (const branch of Object.values(BRANCHES)) {
    assert.ok(branch.ranks.length >= 20, `${branch.name} should have at least 20 rank options`);
    const codes = branch.ranks.map((rank) => rank.code);
    assert.equal(new Set(codes).size, codes.length, `${branch.name} contains duplicate rank codes`);
    for (const rank of branch.ranks) {
      assert.ok(rank.name);
      assert.ok(rank.paygrade);
      assert.ok(Number.isInteger(rank.order));
    }
  }
});

test('rank lookup is case-insensitive and unknown branches fall back to Army', () => {
  assert.equal(getRank('army', 'sgt').name, 'Sergeant');
  assert.equal(getRank('navy', 'cpo').paygrade, 'E-7');
  assert.equal(getBranch('unknown').id, 'army');
});

test('rank autocomplete searches codes, paygrades, names, and caps at 25', () => {
  assert.ok(searchRanks('army', 'lieutenant').every((rank) => rank.name.includes('Lieutenant')));
  assert.ok(searchRanks('marine_corps', 'E-9').length >= 3);
  assert.ok(searchRanks('army', '').length <= 25);
});

