import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_DATABASE
}
dotenv.config()

const connection = await mysql.createConnection(config)

export class MovieModel {
  static async getAll ({ genre }) {
    const [movies] = await connection.query(
      // get genre ids from database table using genre name
      'SELECT title, year, director, duration, poster, rate, BIN_TO_UUID(id) id from movie;'
    )
    return movies
  }

  static async getById ({ id }) {
    const [movies] = await connection.query(
    // get genre ids from database table using genre name
      `SELECT title, year, director, duration, poster, rate, BIN_TO_UUID(id) id
      FROM movie WHERE id = UUID_TO_BIN(?);`,
      [id]
    )

    if (movies.length === 0) return null
    return movies[0]
  }

  static async create ({ input }) {
    const {
      title,
      year,
      director,
      duration,
      poster,
      rate
    } = input

    const [uuiResult] = await connection.query('SELECT UUID() uuid;')
    const [{ uuid }] = uuiResult

    try {
      await connection.query(
        `INSERT INTO movie (id, title, year, director, duration, poster, rate) VALUES ( UUID_TO_BIN("${uuid}"), ?, ?, ?, ?, ?, ?)`,
        [title, year, director, duration, poster, rate]
      )
    } catch (e) {
      throw new Error('Error creating movie')
    }

    const [movies] = await connection.query(
      `SELECT title, year, director, duration, poster, rate, BIN_TO_UUID(id) id
      FROM movie WHERE id = UUID_TO_BIN(?)`,
      [uuid]
    )
    return movies[0]
  }

  static async delete ({ id }) {
  }

  static async update ({ id, input }) {
  }
}
