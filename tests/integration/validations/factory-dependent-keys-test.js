import { A } from '@ember/array';
import EmberObject from '@ember/object';
import { Errors } from '@ember-data/model/-private';
import setupObject from '../../helpers/setup-object';
import CollectionValidator from 'dummy/validators/collection';
import LengthValidator from 'dummy/validators/length';
import DSErrorValidator from 'dummy/validators/ds-error';
import { validator, buildValidations } from 'ember-cp-validations';
import { module, test, skip } from 'qunit';
import { setupTest } from 'ember-qunit';

module(
  'Integration | Validations | Factory - Dependent Keys',
  function (hooks) {
    setupTest(hooks);

    test('collection validator creates correct dependent keys', function (assert) {
      this.owner.register('validator:collection', CollectionValidator);
      this.owner.register('validator:length', LengthValidator);

      let CollectionValidations = buildValidations({
        array: [
          validator('collection', true),
          validator('length', {
            is: 2,
            message: 'Array must have {is} items',
          }),
        ],
      });
      let obj = setupObject(this, EmberObject.extend(CollectionValidations), {
        array: A(['foo', 'bar']),
      });

      assert.equal(obj.get('validations.attrs.array.isValid'), true);

      obj.get('array').removeObject('bar');

      assert.equal(obj.get('validations.attrs.array.isValid'), false);
      assert.equal(
        obj.get('validations.attrs.array.message'),
        'Array must have 2 items'
      );
    });

    test('ds-error validator creates correct dependent keys', function (assert) {
      this.owner.register('validator:ds-error', DSErrorValidator);
      this.owner.register('validator:length', LengthValidator);

      let DSErrorValidations = buildValidations({
        username: validator('ds-error'),
      });
      let obj = setupObject(this, EmberObject.extend(DSErrorValidations), {
        errors: Errors.create(),
        username: '',
      });

      assert.equal(obj.get('validations.attrs.username.isValid'), true);

      obj.get('errors').add('username', 'Username is not unique');

      assert.equal(obj.get('validations.attrs.username.isValid'), false);
      assert.equal(
        obj.get('validations.attrs.username.message'),
        'Username is not unique'
      );
    });

    // ember-validators v4.0.0 broke the ds-error validator for nested objects
    skip('nested ds-error validator creates correct dependent keys', function (assert) {
      this.owner.register('validator:ds-error', DSErrorValidator);
      this.owner.register('validator:length', LengthValidator);

      let DSErrorValidations = buildValidations({
        'model.username': validator('ds-error'),
      });

      let obj = setupObject(this, EmberObject.extend(DSErrorValidations), {
        model: EmberObject.create({
          errors: Errors.create(),
          username: '',
        }),
      });

      assert.equal(obj.get('validations.attrs.model.username.isValid'), true);

      obj.get('model.errors').add('username', 'Username is not unique');

      assert.equal(obj.get('validations.attrs.model.username.isValid'), false);
      assert.equal(
        obj.get('validations.attrs.model.username.message'),
        'Username is not unique'
      );
    });

    test('custom dependent keys - simple', function (assert) {
      let Validations = buildValidations({
        fullName: validator('inline', {
          dependentKeys: ['model.firstName', 'model.lastName'],
          validate(value, options, model) {
            let firstName = model.get('firstName');
            let lastName = model.get('lastName');
            if (!firstName || !lastName) {
              return 'Full name requires first and last name';
            }
            return true;
          },
        }),
      });

      let obj = setupObject(this, EmberObject.extend(Validations));

      assert.equal(obj.get('validations.isValid'), false);
      assert.equal(obj.get('validations.attrs.fullName.isValid'), false);
      assert.equal(
        obj.get('validations.attrs.fullName.message'),
        'Full name requires first and last name'
      );

      obj.set('firstName', 'Offir');
      obj.set('lastName', 'Golan');

      assert.equal(obj.get('validations.isValid'), true);
      assert.equal(obj.get('validations.attrs.fullName.isValid'), true);
    });

    test('custom dependent keys - default options', function (assert) {
      let Validations = buildValidations({
        fullName: {
          dependentKeys: ['model.firstName'],
          validators: [
            validator('inline', {
              dependentKeys: ['model.lastName'],
              validate(value, options, model) {
                let firstName = model.get('firstName');
                let lastName = model.get('lastName');
                if (!firstName || !lastName) {
                  return 'Full name requires first and last name';
                }
                return true;
              },
            }),
          ],
        },
      });

      let obj = setupObject(this, EmberObject.extend(Validations));

      assert.equal(obj.get('validations.isValid'), false);
      assert.equal(obj.get('validations.attrs.fullName.isValid'), false);
      assert.equal(
        obj.get('validations.attrs.fullName.message'),
        'Full name requires first and last name'
      );

      obj.set('firstName', 'Offir');
      obj.set('lastName', 'Golan');

      assert.equal(obj.get('validations.isValid'), true);
      assert.equal(obj.get('validations.attrs.fullName.isValid'), true);
    });

    test('custom dependent keys - global options', function (assert) {
      let Validations = buildValidations(
        {
          fullName: {
            dependentKeys: ['model.firstName'],
            validators: [
              validator('inline', {
                dependentKeys: ['model.lastName'],
                validate(value, options, model) {
                  let firstName = model.get('firstName');
                  let lastName = model.get('lastName');
                  let middleName = model.get('middleName');
                  if (!firstName || !lastName || !middleName) {
                    return 'Full name requires first, middle, and last name';
                  }
                  return true;
                },
              }),
            ],
          },
        },
        {
          dependentKeys: ['model.middleName'],
        }
      );

      let obj = setupObject(this, EmberObject.extend(Validations));

      assert.equal(obj.get('validations.isValid'), false);
      assert.equal(obj.get('validations.attrs.fullName.isValid'), false);
      assert.equal(
        obj.get('validations.attrs.fullName.message'),
        'Full name requires first, middle, and last name'
      );

      obj.set('firstName', 'Offir');
      obj.set('lastName', 'Golan');

      assert.equal(obj.get('validations.isValid'), false);
      assert.equal(obj.get('validations.attrs.fullName.isValid'), false);

      obj.set('middleName', 'David');

      assert.equal(obj.get('validations.isValid'), true);
      assert.equal(obj.get('validations.attrs.fullName.isValid'), true);
    });

    test('custom dependent keys - nested object', function (assert) {
      let Validations = buildValidations({
        page: validator('inline', {
          dependentKeys: ['model.currPage', 'model.meta.pages.last'],
          validate(value, options, model) {
            let currPage = model.get('currPage');
            let lastPage = model.get('meta.pages.last');
            if (currPage > lastPage) {
              return 'Cannot exceed max page';
            }
            return true;
          },
        }),
      });

      let obj = setupObject(this, EmberObject.extend(Validations), {
        meta: {
          pages: {
            last: 5,
          },
        },
        currPage: 4,
      });

      assert.equal(obj.get('validations.isValid'), true);
      assert.equal(obj.get('validations.attrs.page.isValid'), true);

      obj.set('currPage', 6);

      assert.equal(obj.get('validations.isValid'), false);
      assert.equal(obj.get('validations.attrs.page.isValid'), false);
      assert.equal(
        obj.get('validations.attrs.page.message'),
        'Cannot exceed max page'
      );

      obj.set('meta.pages.last', 7);

      assert.equal(obj.get('validations.isValid'), true);
      assert.equal(obj.get('validations.attrs.page.isValid'), true);
    });

    test('custom dependent keys - array', function (assert) {
      let Validations = buildValidations({
        friends: validator('inline', {
          dependentKeys: ['model.friends.[]'],
          validate(value, options, model) {
            let friends = model.get('friends');
            if (!friends || friends.length === 0) {
              return 'User must have a friend';
            }
            return true;
          },
        }),
      });

      let obj = setupObject(this, EmberObject.extend(Validations), {
        friends: A(),
      });

      assert.equal(obj.get('validations.isValid'), false);
      assert.equal(obj.get('validations.attrs.friends.isValid'), false);
      assert.equal(
        obj.get('validations.attrs.friends.message'),
        'User must have a friend'
      );

      obj.get('friends').pushObject('Offir');

      assert.equal(obj.get('validations.isValid'), true);
      assert.equal(obj.get('validations.attrs.friends.isValid'), true);

      obj.get('friends').removeObject('Offir');

      assert.equal(obj.get('validations.isValid'), false);
      assert.equal(obj.get('validations.attrs.friends.isValid'), false);
      assert.equal(
        obj.get('validations.attrs.friends.message'),
        'User must have a friend'
      );
    });

    test('custom dependent keys - array of objects', function (assert) {
      let Validations = buildValidations({
        friends: validator('inline', {
          dependentKeys: ['model.friends.@each.name'],
          validate(value, options, model) {
            let friends = model.get('friends');
            if (!friends || friends.length === 0) {
              return 'User must have a friend';
            } else if (friends.length > 0) {
              let names = friends.filter((f) => f.name);
              if (names.length !== friends.length) {
                return 'All friends must have a name';
              }
            }
            return true;
          },
        }),
      });

      let obj = setupObject(this, EmberObject.extend(Validations), {
        friends: A(),
      });

      assert.equal(obj.get('validations.isValid'), false);
      assert.equal(obj.get('validations.attrs.friends.isValid'), false);
      assert.equal(
        obj.get('validations.attrs.friends.message'),
        'User must have a friend'
      );

      obj.get('friends').pushObject(
        EmberObject.create({
          name: 'Offir',
        })
      );

      assert.equal(obj.get('validations.isValid'), true);
      assert.equal(obj.get('validations.attrs.friends.isValid'), true);

      obj.get('friends.0').set('name', undefined);

      assert.equal(obj.get('validations.isValid'), false);
      assert.equal(obj.get('validations.attrs.friends.isValid'), false);
      assert.equal(
        obj.get('validations.attrs.friends.message'),
        'All friends must have a name'
      );
    });
  }
);
