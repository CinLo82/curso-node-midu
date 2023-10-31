import mysql from 'mysql2/promise'

const DEFAULT_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_DATABASE
}

const connectionString = process.env.DATABASE_URL ?? DEFAULT_CONFIG

const connection = await mysql.createConnection(connectionString)

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
      genre: genreInput, // genre is an array
      title,
      year,
      duration,
      director,
      rate,
      poster
    } = input

    // todo: crear la conexión de genre

    // crypto.randomUUID()
    const [uuidResult] = await connection.query('SELECT UUID() uuid;')
    const [{ uuid }] = uuidResult

    try {
      await connection.query(
        `INSERT INTO movie (id, title, year, director, duration, poster, rate)
          VALUES (UUID_TO_BIN("${uuid}"), ?, ?, ?, ?, ?, ?);`,
        [title, year, director, duration, poster, rate]
      )

      if (genreInput && genreInput.length > 0) {
        for (const genre of genreInput) {
          // Comprueba si el género ya existe en la tabla de géneros
          const [genreResult] = await connection.query(
            'SELECT id FROM genre WHERE name = ?;',
            [genre]
          )

          if (genreResult.length === 0) {
          // Si el género no existe, créalo
            const [insertedGenre] = await connection.query(
              'INSERT INTO genre (name) VALUES (?);',
              [genre]
            )
            // Obtiene el ID del género recién insertado
            const genreId = insertedGenre.insertId
            // Asocia la película con el género en la tabla de relaciones
            await connection.query(
              'INSERT INTO movie_genre (movie_id, genre_id) VALUES (UUID_TO_BIN(?), ?);',
              [uuid, genreId]
            )
          } else {
            // El género ya existe, asocia la película con el género existente en la tabla de relaciones
            const [{ id: genreId }] = genreResult
            await connection.query(
              'INSERT INTO movie_genre (movie_id, genre_id) VALUES (UUID_TO_BIN(?), ?);',
              [uuid, genreId]
            )
          }
        }
      }
      const [movies] = await connection.query(
        `SELECT title, year, director, duration, poster, rate, BIN_TO_UUID(id) id
        FROM movie WHERE id = UUID_TO_BIN(?);`,
        [uuid]
      )

      return movies[0]
    } catch (e) {
      throw new Error('Error creating movie')
    }
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
