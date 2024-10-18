const multer = require("multer");
const { dbClient } = require("../db/dbClient.cjs");
const { validationResult, param } = require("express-validator");
const { isCompletedAfterRelease } = require("../utils/dateUtil.cjs");
const { cleanObject } = require("../utils/cleanObject.cjs");
const { uploadImage } = require("../services/imageHost.cjs");
const { animeSearchService } = require("../services/animeSearch.cjs");
const { ratings, defaultFilters } = require("../constants/animeFilters.cjs");
const validator = require("./validator.cjs");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const limit = 6;

const renderAnimeList = (res, animeSeriesObj) => {
  res.render("listAnime", {
    animeSeries: animeSeriesObj.rows,
    nextPage: animeSeriesObj.nextPage,
    currentPage: animeSeriesObj.currentPage,
    prevPage: animeSeriesObj.prevPage,
  });
};

exports.ListAnimeSeriesGet = async (req, res) => {
  const animeSeriesObj = await dbClient.getAllAnimeSeriesDate(limit, 0, 1);
  renderAnimeList(res, animeSeriesObj);
};

exports.ListAnimeByPagination = async (req, res) => {
  const page = Math.max(Number(req.params.page) || 1, 1);
  const animeSeriesObj = await dbClient.getAllAnimeSeriesDate(
    limit,
    (page - 1) * limit,
    page
  );
  renderAnimeList(res, animeSeriesObj);
};

exports.addAnimeInfoGet = async (req, res) => {
  const genres = await dbClient.getAllGenre();

  res.render("addAnime", { genres, values: {} });
};

exports.addAnimeInfoPost = [
  upload.single("image"),
  validator.animeInfoValidator,
  async (req, res) => {
    const validatedResult = validationResult(req);
    if (!validatedResult.isEmpty()) {
      const genres = await dbClient.getAllGenre();
      res.render("addAnime", {
        errors: validatedResult.array(),
        genres: genres,
        values: req.body,
      });
    } else {
      const data = req.body;

      if (req.file) {
        const uploadRes = await uploadImage(req.file);
        if (uploadRes.success) data.image_url = uploadRes.data.image.url;
        else data.image_url = "";
      } else {
        console.error("no image found");
      }

      data.genre = !data.genre
        ? []
        : Array.isArray(data.genre)
        ? data.genre
        : [data.genre];

      data.episodes = Number(data.episodes) || null;
      data.duration = data.duration || "unknown";
      data.rating = Number(data.rating) || null;
      data.scored_by = Number(data.scored_by) || null;
      data.rank = Number(data.rank) || null;
      data.popularity = Number(data.popularity) || null;
      data.favorites = Number(data.favorites) || null;
      data.synopsis = data.synopsis || "No synopsis available";

      data.release_date ||= null;
      data.completed_date ||= null;

      const isCompleted = isCompletedAfterRelease(
        data.completed_date,
        data.release_date
      );
      if (isCompleted === true) {
        data.status = "completed";
      } else if (isCompleted === false && data.completed_date) {
        data.status = "ongoing";
      } else {
        data.status = "unknown";
      }

      await dbClient.addAnimeData(data);
      res.redirect("/");
    }
  },
];

exports.getAnimeGenre = async (req, res) => {
  const avilableGenres = await dbClient.getAllGenre();
  res.json(avilableGenres);
};

exports.getAnimeRatings = async (req, res) => {
  const getRatings = () =>
    new Promise((resolve) => {
      resolve(ratings);
    });
  const response = await getRatings();
  res.json(response);
};

exports.addAnimeGenreGet = async (req, res) => {
  const avilableGenres = await dbClient.getAllGenre();
  res.render("addGenre", { avilableGenres, ratings, defaultFilters });
};

exports.addAnimeGenrePost = [
  validator.genreInfoValidator,
  async (req, res) => {
    const validatedResult = validationResult(req);
    const avilableGenres = await dbClient.getAllGenre();
    if (!validatedResult.isEmpty()) {
      res.render("addGenre", {
        avilableGenres,
        errors: validatedResult.array(),
        value: req.body.genre,
      });
    } else {
      const genre = req.body.genre.toLowerCase();
      if (!avilableGenres.includes(genre)) {
        await dbClient.addGenre(genre);
        res.redirect("/add-genre");
      } else {
        const genreExistError = {
          msg: "Genre already exists.",
          param: "genre",
          location: "body",
        };
        validatedResult.errors.push(genreExistError);
        res.render("addGenre", {
          avilableGenres,
          errors: validatedResult.array(),
          value: req.body.genre,
        });
      }
    }
  },
];

exports.searchAnimeGet = async (req, res) => {
  const genres = await dbClient.getAllGenre();
  res.render("searchAnime", { ratings, genres });
};

exports.searchAnimePost = [
  validator.searchQueryValidator,
  async (req, res) => {
    const validatedResult = validationResult(req);
    const genres = await dbClient.getAllGenre();
    if (!validatedResult.isEmpty()) {
      res.render("searchAnime", {
        ratings,
        genres,
        errors: validatedResult.array(),
      });
      return;
    }
    const reqBody = cleanObject(req.body);
    const { search, ...filters } = reqBody;
    const data = await animeSearchService.searchAnimeByName(search, filters);
    const {
      name,
      release_date,
      completed_date,
      status,
      creator,
      rating,
      genre,
      image_url,
      episodes,
      duration,
      age_rating,
      scored_by,
      rank,
      popularity,
      favorites,
      synopsis,
    } = data["data"][0];
    console.log(data);
    res.render("searchAnime", { ratings, genres, animeData: data || [] });
  },
];
