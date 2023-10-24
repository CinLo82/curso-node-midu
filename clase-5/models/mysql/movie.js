import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_DATABASE
}

const connection = await mysql.createConnection(config)

export class MovieModel {
  static async getAll ({ genre }) {
    if (genre) {
      const lowerCaseGenre = genre.toLowerCase()

      // get genre ids from database table using genre names
      const [genres] = await connection.query(
        'SELECT id, name FROM genre WHERE LOWER(name) = ?;',
        [lowerCaseGenre]
      )
      if (genres.length === 0) return []

      const [{ id }] = genres

      // obtener las peliculas q pertenecen al genero
      const [movies] = await connection.query(
        'SELECT title, year, director, duration, poster, rate, BIN_TO_UUID(id) id ' +
        'FROM movie JOIN movie_genre ON movie.id = movie_genre.movie_id ' +
        'WHERE movie_genre.genre_id = ?;',
        [id]
      )
      return movies
    }

    // Si no se proporciona un género, obtener todas las películas
    const [movies] = await connection.query(
      'SELECT title, year, director, duration, poster, rate, BIN_TO_UUID(id) id ' +
      'FROM movie;'
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
        `INSERT INTO movie (id, title, year, director, duration, poster, rate)' + 'VALUES ( UUID_TO_BIN("${uuid}"), ?, ?, ?, ?, ?, ?)`,
        [uuid, title, year, director, duration, poster, rate]
      )
    } catch (e) {
      throw new Error('Error creating movie')
    }

    const [movies] = await connection.query(
      `SELECT title, year, director, duration, poster, rate, BIN_TO_UUID(id) id' +
      'FROM movie WHERE id = UUID_TO_BIN(?)`,
      [uuid]
    )
    return movies[0]
  }

  static async delete ({ id }) {
    try {
      const results = await connection.query(
        'DELETE FROM movie WHERE id = UUID_TP_BYN(?);',
        [id]
      )
      // verificar si se elimino la pelicula
      if (results.affectedRows === 0) {
        return false
      }
      return true
    } catch (e) {
      throw new Error('Error deleting movie')
    }
  }

  static async update ({ id, input }) {
    const {
      title,
      year,
      director,
      duration,
      poster,
      rate
    } = input
    try {
      const results = await connection.query(
        'UPDATE movie SET title = ?, year = ?, director = ?, duration = ?, poster = ?, rate = ? ' +
        'WHERE id = UUID_TO_BIN(?);',
        [title, year, director, duration, poster, rate, id]
      )
      // Verificar si se actualizó la película (comprobar cuántas filas se afectaron)
      if (results.affectedRows === 0) {
        return null // No se encontró la película
      }
      // Obtener la película actualizada
      const [movies] = await connection.query(
        'SELECT title, year, director, duration, poster, rate, BIN_TO_UUID(id) id ' +
        'FROM movie WHERE id = UUID_TO_BIN(?);',
        [id]
      )
      return movies[0]
    } catch (e) {
      throw new Error('Error updating movie')
    }
  }
}
