'use strict';

var utils = require(`../helpers/writer`);
var Default = require(`../services/DefaultService`);

module.exports.addPet = function addPet (req, res) {
    var body = req.swagger.params[`body`].value;
    Default.addPet(body)
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, response);
        });
};

module.exports.deletePet = function deletePet (req, res) {
    var id = req.swagger.params[`id`].value;
    Default.deletePet(id)
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, response);
        });
};

module.exports.findPetById = function findPetById (req, res) {
    var id = req.swagger.params[`id`].value;
    Default.findPetById(id)
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, response);
        });
};

module.exports.findPets = function findPets (req, res) {
    var tags = req.swagger.params[`tags`].value;
    var limit = req.swagger.params[`limit`].value;
    Default.findPets(tags,limit)
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, response);
        });
};
