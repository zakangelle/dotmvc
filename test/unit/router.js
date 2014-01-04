var Router = require('../../lib/Router.js');

QUnit.module('Router');

test('Pattern parsing', function() {

  var compile = Router.compilePattern;

  // fuck them slashes
  strictEqual(compile('route').test('route'), true);
  strictEqual(compile('route').test('/route'), true);
  strictEqual(compile('route').test('route/'), true);
  strictEqual(compile('route').test('/route/'), true);
  strictEqual(compile('route').test('shit'), false);
  strictEqual(compile('route').test('routeshit'), false);
  strictEqual(compile('route').test('shitroute'), false);

  // 1 or more normal params, lose the first parenth
  strictEqual(compile('route/{a}').test('route/something'), true);
  strictEqual(compile('route/{a}').test('/route/something'), true);
  strictEqual(compile('/route/{a}').test('route/something'), true);
  strictEqual(compile('/route/{a}').test('/route/something'), true);
  strictEqual(compile('/route/{a}').test('wrong/something'), false);
  strictEqual(compile('/route/{a}').test('route'), false);
  strictEqual(compile('/route/{a}').test('route/'), false);

  strictEqual(compile('/route/{a}').test('/route/something with spaces'), true);
  strictEqual(compile('/route/{a}').test('/route/something-dashed'), true);
  strictEqual(compile('/route/{a}').test('/route/something-dashed@weird !'), true);
  strictEqual(compile('/route/{a}').test('/route/something/too/much'), false);

  strictEqual(compile('route/{a}').exec('route/something')[1], 'something', true);
  strictEqual(compile('route/{a}/{b}').exec('route/something/else')[1], 'something', true);
  strictEqual(compile('route/{a}/{b}').exec('/route/something/else/')[1], 'something', true);
  strictEqual(compile('route/{a}/{b}').exec('/route/something missing'), null);

  strictEqual(compile('some/long/prefix/{a}').test('some/long/prefix/something'), true);

  strictEqual(compile('route/{a?}').test('route'), true, 'a');
  strictEqual(compile('route/{a?}').test('/route'), true, 'b');
  strictEqual(compile('route/{a?}').test('/route/'), true, 'c');
  strictEqual(compile('route/{a?}').test('route/something'), true, 'd');
  strictEqual(compile('route/{a?}').test('/route/something'), true, 'e');
  strictEqual(compile('route/{a?}').test('/route/something/'), true, 'f');

  strictEqual(compile('route/{a}/{b?}').test('route/something/else'), true);
  strictEqual(compile('route/{a}/{b?}').test('route/something/'), true);
  strictEqual(compile('route/{a}/{b?}').test('route/something'), true);

  strictEqual(compile('route/{a}/{b?}').exec('route/something/else')[1], 'something');
  strictEqual(compile('route/{a}/{b?}').exec('route/something/else')[2], 'else');

  strictEqual(compile('route/{a...}').test('route/lots of rando shit!'), true);
  strictEqual(compile('route/{a...}').test('route/lots / / /of rando shit!'), true);
  strictEqual(compile('route/{a...}').test('route'), false);
  strictEqual(compile('route/{a...}').test('route/'), false);
  var rando = 'asdfa !!!! / / / //df df df / asdf ';
  strictEqual(compile('route/{a...}').exec('route/' + rando)[1], rando);

  strictEqual(compile('route/{a...?}').test('route/lots of rando shit!'), true);
  strictEqual(compile('route/{a...?}').test('route'), true);
  strictEqual(compile('route/{a...?}').test('route/'), true);

  strictEqual(compile('route/{a}/{b}/{c...?}').test('route/1'), false, '1');
  strictEqual(compile('route/{a}/{b}/{c...?}').test('route/1/'), false, '2');
  strictEqual(compile('route/{a}/{b}/{c...?}').test('route/1/2'), true, '3');
  strictEqual(compile('route/{a}/{b}/{c...?}').test('route/1/2/'), true, '4');
  strictEqual(compile('route/{a}/{b}/{c...?}').test('route/1/2/3'), true, '5');
  strictEqual(compile('route/{a}/{b}/{c...?}').test('route/1/2/3/4/5'), true, '6');

});

test('Basic callback dispatch', 1, function() {

  var r = new Router();
  r.createRoute('/', function() { ok(true, 'callback fired'); });
  r.dispatch('/');

});

test('Parameter passing', 3, function() {

  var router = new Router();
  var paramA = 'asdf';
  var paramB = '1234';
  router.createRoute('/route/{a}', function(a) {
    strictEqual(a, paramA, 'paramter passed');
  });

  router.dispatch('/route/asdf');

  router.createRoute('/route/{a}/{b}', function(a, b) {
    strictEqual(a, paramA, 'a paramter passed');
    strictEqual(b, paramB, 'b paramter passed');
  });

  router.dispatch('/route/asdf/1234');

});

test('Optional params', function() {

  var router = new Router();
  var dispatched = 0;

  router.createRoute('route/{a?}', function(a) {
    dispatched++; // x1
    strictEqual(a, '123', 'a correct value (or missing)');
  });

  router.dispatch('route/123');
  strictEqual(dispatched, 1, 'route/123');

  router.createRoute('another/{a?}/{b?}', function(a, b) {
    dispatched++;
    ok(true, 'another fired'); // 3x
  });

  router.dispatch('another');
  strictEqual(dispatched, 2, 'another');
  router.dispatch('another/1');
  strictEqual(dispatched, 3, 'another/1');
  router.dispatch('another/1/2');
  strictEqual(dispatched, 4, 'another/1/2');
});

test('Action handler', 2, function() {

  var router = new Router();
  var ACTION = {};

  router.addActionHandler({
    executeAction: function(route, args) {
      ok(true, 'executeAction() fired');
      strictEqual(route.action, ACTION, 'action passed');
    }
  });

  router.createRoute('route', ACTION);
  router.dispatch('route');

});

test('Response handler', 2, function() {

  var router = new Router();
  var RESP = {};

  router.createRoute('route/{a?}', function(a) {
    if (a) return RESP;
  });

  router.addResponseHandler({
    handleResponse: function(resp) {
      ok(true, 'handleResponse fired');
      strictEqual(resp, RESP, 'response object passed in');
    }
  });

  router.dispatch('route'); // nop
  router.dispatch('route/something');

});

test('Action handler fallthrough', function() {

  var router = new Router();
  var first = false;
  var a = 0;
  var b = 0;
  router.addActionHandler({
    executeAction: function() { a++; return first; }
  });
  router.addActionHandler({
    executeAction: function() { b++; }
  });

  router.createRoute('something', {});
  router.dispatch('something');
  strictEqual(a, 1, 'first fired');
  strictEqual(b, 1, 'second fired');

  first = true;
  router.dispatch('something');
  strictEqual(a, 2, 'first fired');
  strictEqual(b, 1, 'second NOT fired');

});

test('Response handler fallthrough', function() {

  var router = new Router();
  var first = false;
  var a = 0;
  var b = 0;

  router.addResponseHandler({
    handleResponse: function(resp) { a++; return first; }
  });
  router.addResponseHandler({
    handleResponse: function(resp) { b++; }
  });
  router.createRoute('something', function() { return true; });

  router.dispatch('something');
  strictEqual(a, 1, 'first fired');
  strictEqual(b, 1, 'second fired');

  first = true;
  router.dispatch('something');
  strictEqual(a, 2, 'first fired');
  strictEqual(b, 1, 'second NOT fired');

});