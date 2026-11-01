
import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
app.use(express.json());

let db;

// GET all books
app.get("/books/", async (req, res) => {
  try {
    const books = await db.all("SELECT * FROM book");
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// GET a book by ID
app.get("/books/:bookId/", async (req, res) => {
  try {
    const { bookId } = req.params;

    if (!/^\d+$/.test(bookId)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    const book = await db.get(
      "SELECT * FROM book WHERE id = ?",
      [bookId]
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch book" });
  }
});

// POST a new book
app.post("/books/", async (req, res) => {
  try {
    const { title, author, price, pages } = req.body;

    if (
      typeof title !== "string" || !title.trim() ||
      typeof author !== "string" || !author.trim() ||
      !Number.isInteger(price) || price < 0 ||
      !Number.isInteger(pages) || pages <= 0
    ) {
      return res.status(400).json({ error: "Invalid book details" });
    }

    const result = await db.run(
      `INSERT INTO book (title, author, price, pages)
       VALUES (?, ?, ?, ?)`,
      [title.trim(), author.trim(), price, pages]
    );

    res.status(201).json({
      message: "Book added successfully",
      bookId: result.lastID
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to add book" });
  }
});

// PUT (update) a book
app.put("/books/:bookId/", async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title, author, price, pages } = req.body;

    if (!/^\d+$/.test(bookId)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    if (
      typeof title !== "string" || !title.trim() ||
      typeof author !== "string" || !author.trim() ||
      !Number.isInteger(price) || price < 0 ||
      !Number.isInteger(pages) || pages <= 0
    ) {
      return res.status(400).json({ error: "Invalid book details" });
    }

    const result = await db.run(
      `UPDATE book
       SET title = ?, author = ?, price = ?, pages = ?
       WHERE id = ?`,
      [title.trim(), author.trim(), price, pages, bookId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(200).json({ message: "Book updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update book" });
  }
});

// DELETE a book
app.delete("/books/:bookId/", async (req, res) => {
  try {
    const { bookId } = req.params;

    if (!/^\d+$/.test(bookId)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    const result = await db.run(
      "DELETE FROM book WHERE id = ?",
      [bookId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete book" });
  }
});

// Initialize the database and start the server
async function initializeDBAndServer() {
  try {
    db = await open({
      filename: "./books.db",
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL,
        pages INTEGER NOT NULL
      )
    `);

    const row = await db.get("SELECT COUNT(*) AS count FROM book");

    if (row.count === 0) {
      const books = [
        ["The Alchemist", "Paulo Coelho", 250, 208],
        ["Wings of Fire", "A. P. J. Abdul Kalam", 300, 180],
        ["Atomic Habits", "James Clear", 450, 320],
        ["The Hobbit", "J. R. R. Tolkien", 350, 310],
        ["1984", "George Orwell", 200, 328],
        ["Clean Code", "Robert C. Martin", 600, 464],
        ["The Great Gatsby", "F. Scott Fitzgerald", 220, 180],
        ["Rich Dad Poor Dad", "Robert Kiyosaki", 280, 336],
        ["Think and Grow Rich", "Napoleon Hill", 240, 250],
        ["Ikigai", "Hector Garcia", 260, 194]
      ];

      const insertBook = await db.prepare(
        `INSERT INTO book (title, author, price, pages)
         VALUES (?, ?, ?, ?)`
      );

      try {
        for (const book of books) {
          await insertBook.run(book);
        }
      } finally {
        await insertBook.finalize();
      }
    }

    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000");
    });
  } catch (error) {
    console.error("Unable to initialize database and server:", error.message);
    process.exitCode = 1;
  }
}

initializeDBAndServer();
