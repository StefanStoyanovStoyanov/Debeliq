import sys
import re
import argparse
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from image_to_fen import ChessboardPredictor
import load_image
from config import IMAGE_PATH, STOCKFISH_PATH
import chess
import chess.engine


def shorten_fen(fen: str) -> str:
    fields = fen.split(" ", 1)
    board = re.sub(r"1+", lambda m: str(len(m.group(0))), fields[0])
    return board if len(fields) == 1 else f"{board} {fields[1]}"


def infer_turn(fen: str) -> str:
    board = chess.Board(shorten_fen(fen))
    status = board.status()
    if status == chess.STATUS_OPPOSITE_CHECK:
        board.turn = not board.turn
    elif status != chess.STATUS_VALID:
        raise ValueError(f"Detected an invalid chess position (status {status}).")
    return board.fen()


def unflip_fen(fen: str) -> str:
    rows = fen.split("/")
    return "/".join(rows[::-1])


def lengthen_fen(fen: str) -> str:
    result = ""
    for c in fen:
        if c.isdigit():
            result += "1" * int(c)
        else:
            result += c
    return result


def get_fen_from_image(invert_fen: bool = False, image_path: str = IMAGE_PATH) -> str:
    predictor = ChessboardPredictor()
    try:
        img = load_image.load_image(image_path)
        if img is None:
            raise ValueError(f"Couldn't load image: {image_path}")
        img = load_image.resize_image(img)
        if img is None:
            raise ValueError(f"Image is too large to process: {image_path}")
        tiles, _ = __import__("chessboard_finder").findGrayscaleTilesInImage(img)
        if tiles is None:
            raise ValueError("Couldn't find chessboard in image.")
        fen, _ = predictor.get_prediction(tiles)
    finally:
        predictor.close()

    if invert_fen:
        fen = unflip_fen(fen)

    return fen


def fen_to_best_moves(fen):
    fen = infer_turn(fen)
    board = chess.Board(fen)
    moves = {chess.WHITE: None, chess.BLACK: None}

    with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
        for color in (chess.WHITE, chess.BLACK):
            position = board.copy(stack=False)
            position.turn = color
            status = position.status()
            if status == chess.STATUS_OPPOSITE_CHECK:
                continue
            if status != chess.STATUS_VALID or position.is_game_over():
                continue

            result = engine.play(position, chess.engine.Limit(time=2.0))
            moves[color] = result.move.uci() if result.move else None

    white_move = moves[chess.WHITE]
    black_move = moves[chess.BLACK]
    return white_move, black_move


def main():
    parser = argparse.ArgumentParser(
        description="Extract FEN from image and calculate best moves"
    )
    parser.add_argument(
        "--invert_fen",
        action="store_true",
        help="Invert FEN so white pieces are on bottom",
    )
    parser.add_argument(
        "--fen", help="Provide FEN directly instead of extracting from image"
    )
    args = parser.parse_args()

    if args.fen:
        fen = args.fen
    else:
        fen = get_fen_from_image(args.invert_fen)

    if fen is None:
        print("Failed to extract FEN from image.")
        sys.exit(1)

    fen = infer_turn(fen)
    print(f"Predicted FEN: {fen}")
    white_move, black_move = fen_to_best_moves(fen)
    print(f"Best move for White: {white_move or 'No legal move'}")
    print(f"Best move for Black: {black_move or 'No legal move'}")
    return white_move, black_move


if __name__ == "__main__":
    main()
