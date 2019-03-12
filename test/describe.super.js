module.exports = {
  appName: 'Doggy',

  resources: {
    mares: {
      patch: {},
      out: {
        hello: {
          type: 'number',
          flags: {
            unsafe: false,
          },
          invalids: [
            Infinity,
            -Infinity,
          ],
        },
        number: {
          type: 'number',
        },
        image: {
          type: 'string',
          format: 'loi_internal_Image',
        },
      },
      in: {
        body: {
          type: 'object',
          children: {
            hello: {
              type: 'number',
              flags: {
                unsafe: false,
              },
              invalids: [
                Infinity,
                -Infinity,
              ],
            },
          },
        },
      },
    },
    dogs: {
      description: 'Dog resources',
      delete: {
        permissions: ['admin'],
      },
      permissions: ['dogs'],
      put: {},
      in: {
        body: {
          children: {
            name: {
              invalids: [
                '',
              ],
              type: 'string',
            },
            array: {
              flags: {
                sparse: false,
              },
              items: [
                {
                  invalids: [
                    '',
                  ],
                  type: 'string',
                },
              ],
              type: 'array',
            },
          },
          type: 'object',

        },
        query: {
          children: {
            hello: {
              invalids: [
                '',
              ],
              type: 'string',
            },
          },
          type: 'object',
        },
        params: {
          children: {
            hello: {
              invalids: [
                '',
              ],
              type: 'string',
            },
          },
          type: 'object',
        },
      },
      auth: {
        local: {
          userField: 'user',
          passwordField: 'password',
        },
        magicLink: {
          emailField: 'email',
        },
        magicCode: {
          emailField: 'email',
        },
      },
      out: {
        name: {
          invalids: [
            '',
          ],
          type: 'string',
        },
        horses: {
          type: 'string',
        },
        horses_id: {
          type: 'string',
          description: 'A horse Id',
        },
        horses_ids: {
          type: 'string',
          description: 'An array of horse Ids',
        },
        createdAt: {
          type: 'string',
          description: 'Creation date of resource',
        },
        updatedAt: {
          type: 'string',
          description: 'Date of latest update of resource',
        },
      },
      get: {},
      getId: {},
    },
    horses: {
      delete: {},
      get: {},
      getId: {},
      patch: {},
      put: {},
      out: {
        hello: {
          type: 'number',
          description: 'a field',
        },
      },
    },
    dragons: {
      get: {},
      getId: {},
      put: {},
      patch: {},
      delete: {},
    },

  },
};
