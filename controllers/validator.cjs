const { body } = require("express-validator");

const invalidCharacterError =
  "Shouldnt contain extra character other than alphabet";

const animeInfoValidator = [
  body("name")
    .matches(/[a-zA-Z\s]/)
    .withMessage("Name: " + invalidCharacterError)
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be at least 3 character long"),
  body("creator")
    .matches(/[a-zA-Z\s]/)
    .withMessage("Creator: " + invalidCharacterError)
    .isLength({ min: 2, max: 50 })
    .withMessage("Length of create must be at least 2 character long"),
  body("rating").isNumeric().withMessage("Rating should be numeric"),
  body("genre").exists().withMessage("Select at least one genre"),
  body("release_date").isDate().withMessage("Released date is required"),
];

const genreInfoValidator = [
  body("genre")
    .isString()
    .withMessage("genre must be string(internal error)")
    .matches(/[a-zA-Z\s]/)
    .withMessage("Genre: " + invalidCharacterError)
    .isLength({ min: 3 })
    .withMessage("Require at least 3 chracters long"),
];

module.exports = { animeInfoValidator, genreInfoValidator };
