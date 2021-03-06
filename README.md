# Dot MVC

[![Build Status](https://travis-ci.org/bvalosek/dotmvc.png?branch=master)](https://travis-ci.org/bvalosek/dotmvc)
[![NPM version](https://badge.fury.io/js/dotmvc.png)](http://badge.fury.io/js/dotmvc)

A tiny, sensible, client-side MVC framework in modern Javascript. It was
created to provide a rich but minimal set of tools for creating scalable and
powerful Javascript in the real world of shipping code quickly and correctly.

* Website
* [API Documentation](doc)
* Dot MVC example app (source)
* [Dot MVC on Twitter](http://twitter.com/dotmvc)
* [Issues](http://github.com/bvalosek/dotmvc/issues)

## Installation

**Dot MVC** is meant to be used with [Browserify](http://browserify.org/),
which lets you write client-side Javascript with the CommonJS-style module
pattern that compiles down to a single bundle file.

This ultimately keeps your code more organized, allows for better dependency
management with `npm`, and streamlines development-to-production workflows.

```
npm install dotmvc
```

All of the components you'll need are in the `lib/` directory of the package.

```javascript
var View       = require('dotmvc/lib/View');
var Controller = require('dotmvc/lib/Controller');
...
```

Alternatively, all classes are exposed directly on the package itself.

```javascript
var DotMVC = require('dotmvc');

var view = new DotMVC.View();
...
```

## Browser Support

**Dot MVC** is a modern Javascript framework that makes liberal use of the ES5
feature set. This includes the new `Array.prototype` methods as well as
frequent use of `Object.defineProperty()`.

A modern, compliant browser is required.

* Chrome
* Firefox
* Safari
* Opera
* IE 9+

## Overview

### *class* | *mixin* Observable ([API](doc/observable-api.md))

* An *observable object* is an object that can alert listeners when a property
  changes, either automatically by setting up *observable properties*, or
  manually by calling the `triggerPropertyChange()` method.
* Observable properties are managed via ES5 getters and setters, meaning simple
  property assignment is all that is needed to change an observable property
  and emit a change event.
* If an obseverable property is set to an observable object, change events from
  that object will cause change events in the parent object to fire, allowing
  you to nest observable objects.
* Observable properties can either be set to values or functions. The latter
  will track dependencies, effectively allowing you to have *computed
  observable properties*.

#### Creating an Observable Object

You can either directly instantiate an object from the `Observable` class, or
mixin the methods from `Observable.prototype`, or subclass it via prototypical
inheritance. All three methods will give you the functionality needed to
trigger event changes or create observable properties.

#### Computed Observable Properties

Creating an observable property that is a function will track any *dependent
observable properties* accessed during function evaluation.

```javascript
__mixin(Person, Observable);
function Person()
{
  Person.observable({
    firstName : 'John',
    lastName  : 'Doe',
    fullName  : function() {
      return this.firstName + ' ' + this.lastName;
    }
  });
}

var person = new Person();

person.onPropertyChange({
  firstName: function() { console.log('firstName changed'); },
  fullName: function() { console.log('fullName changed'); }
});

person.firstName = 'Bob';
```

This creates a `Person` object called `person`, and wires up some functions to
be fired whenever the `firstName` or `fullName` properties change. The console
output would be:

```
firstName changed.
fullName changed.
```

as `fullName` is a computed observable property with `firstName` as a dependent
property.

### Binding ([API](doc/binding-api.md))

* A Binding is an object that creates a linking between a *source object* /
  *source property* pair, and a *target object* / *target property* pair.
* Bindings are used to keep seperate objects and models in sync without them
  having to be aware of one another.
* The power of bindings comes from the use of `Observable` objects as the
  source, allowing property changes in the source to propigate to the target.
* By default, a binding is *one-way*, meaning that changes in the source are
  reflected in the target.

### *class* View ([API](doc/view-api.md))

* A `View` in Dot MVC is a super-powered chunk of UI. All display logic and
  visual code lives inside of a view.
* Every view has an identic, immutable DOM node that is either created during
  instantiation, or passed in to the constructor.
* A view is drawn via its `render()` method. This method is responsible for
  updating the DOM to reflect the state of the view and its bound data. The
  default behavior depends on whether the view has a *template* or *layout*
  set.
* Views have an observable `context` property that corresponds to the data that
  is currently bound to that view. If the `context` is observable and emits
  change events, the view will automatically be re-rendered.
* A view can have either a layout or a template (or neither). Both specify HTML
  that is to be dumped into the view, but with different semantics.

#### Interacting with the DOM

To access a view's root DOM node, use its `element` property, or the cached
jQuery object `$element`. Don't use global jQuery selectors to find elements
within the view, use the proxied `find` function with the `$` method on the
view:

```javascript
var index = this.$('li.selected').data('index');
```

#### Event Delegation

Event delegation is powered by jQuery's `on()` method. This allows you to
specify a callback on the root, immutable view DOM node that will catch any
events bubbling up from within. All callbacks are automatically bound to the
view's `this` pointer.

```javascript
this.delegate('li', 'click', this.onItemClick);
```

This means even if the DOM identites of the internal elements change (or are
added after the `delegate` method is called), events will still be caught as
expected.

#### Commands

A view should not contain any business or domain logic, but rather delegate any
interaction to either its own data context or a higher-level object, via a
command.  Commands bubble up the DOM hierarchy until finding a view whose own
data context can handle the command.

```javascript
this.executeCommand({ saveUserPreferences: user });
```

With a shortcut for delegating DOM events to fire off commands:

```javascript
this.delegateCommand('#save-button', 'click', { saveUserPreferences: user });
```

#### Layouts vs Templates

A view can either have a template, or a layout, or neither... in which case all
render logic must be done by hand.

Both templates and layouts are functions that generate HTML when passed a
reference to the view. Underscore, Handlebars, etc.  can compile functions like
this.

A template will be injected into a view on every render. This means the entire
previous HTML content of a view is lost, along with any DOM nodes, their
events, and data (events bound with `delegate` are bound to the view's DOM
root-- which doesn't change). This is best for simple views whose content
represents a single object.

A layout will only be injected into a view once, guaranteeing the identity of
the layout DOM elements does not change. This is best when designing larger
views that a composed of several smaller subviews.

Both layouts and templates can be set with their corresponding instance methods
or on the View's constructor as a "static property", e.g.,

```javascript
WidgetView.TEMPLATE = htmlTemplatingFunction;
```

```javascript
// Only works if the view has been initialized yet
myView.setTemplate(htmlTemplatingFunction);
```

#### Creating Sub Views

Compositing views can be done by using the `createViews()` method to
instantiate a new View on an existing interior DOM node. Calling this method
while using a template will log a warning, as the identity of interior DOM
could potentially change, losing the sub view (see Layouts vs Templates above).

```javascript
this.createViews({
  '.view-widget-detail': {
    View: WidgetDetail,
    context: new Binding(this, 'context.currentGroup.currentWidget')
  },
  '.view-group-detail': {
    View: WidgetGroup,
    context: new Binding(this, 'context.currentGroup')
  }
});
```

The hash is a mapping between a jQuery selector and information on how to
create the subview. The `View` parameter specifies the view class, and the
`context` parameter can either be a `Binding` or just an object.

### Application ([API](doc/application-api.md))

### Controller ([API](doc/controller-api.md))

## Coffeescript

Though Dot MVC is written in Javascript and intended to be used in Javascript,
it looks even sexier in Coffeescript if you're lucky enough to be in an
environment where that is acceptable.

### Examples

Using the `extends` keyword and `super` makes subclassing much cleaner:

```coffeescript
class AwesomeWidget extends View
  init: ->
    super
    delegate '.back-button', 'click', @close
```

Since the `observable()` function exists on the constructor of `Observable`,
using this annotation-style declaration works:

```coffeescript
class Person extends Observable
  @observable firstName: 'John'
  @observable lastName: 'Doe'
  @observable fullName: -> '#{@firstName} #{@lastName}'
```

Arrow-style syntax is great here for inline event handling:

```coffeescript
@delegate 'li','click', -> console.log 'dadgum'
```

Noiseless object literals:

```coffeescript
@delegateCommand '#save', 'click', saveUserPreferences: @user
```

## Testing

Unit testing is done by [QUnit](http://qunitjs.com/) and can be run from the
command line via [Grunt](http://gruntjs.com/).

Testing requires [node/npm](http://nodejs.org) and
[grunt-cli](https://github.com/gruntjs/grunt-cli) to be installed on your
system, as well as [bower](https://github.com/bower/bower).

To ensure you have the required apps:

```
npm install -g bower grunt-cli
```

Then install all the dev dependencies and run the tests:

```
npm install
bower install
grunt test
```

## License
Copyright 2013 Brandon Valosek

**Dot MVC** is released under the MIT license.

