package com.example.taskmanagement.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.taskmanagement.dto.BackgroundImageData;
import com.example.taskmanagement.dto.BackgroundImageResponse;
import com.example.taskmanagement.service.BackgroundImageService;

import jakarta.servlet.http.HttpServletRequest;

// 自分の背景画像の窓口。{slot} は、sky（青空）/ sunset（夕焼け）/ night（星空）
@RestController
@RequestMapping("/api/background-images")
public class BackgroundImageController {

	private final BackgroundImageService imageService;

	public BackgroundImageController(BackgroundImageService imageService) {
		this.imageService = imageService;
	}

	// 登録済みの一覧（どの割り当て先に、いつ登録したか）
	@GetMapping
	public List<BackgroundImageResponse> list() {
		return imageService.findAll();
	}

	// 画像そのもの（JPEG）。登録（置き換え）の日時を ETag にして、変わっていなければ、送り直さない（304）
	@GetMapping("/{slot}")
	public ResponseEntity<byte[]> get(@PathVariable String slot) {
		BackgroundImageData image = imageService.find(slot);
		return ResponseEntity.ok()
				.contentType(MediaType.IMAGE_JPEG)
				.eTag("\"" + image.updatedAt().toEpochMilli() + "\"")
				.cacheControl(CacheControl.noCache())
				.body(image.image());
	}

	// 登録（置き換え）。本文は、JPEGのバイト列そのもの
	@PutMapping("/{slot}")
	public BackgroundImageResponse put(@PathVariable String slot, HttpServletRequest request) throws IOException {
		return imageService.save(slot, readLimited(request));
	}

	// 登録した画像を消す（元に戻す）
	@DeleteMapping("/{slot}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable String slot) {
		imageService.delete(slot);
	}

	// 本文を、上限（5MB）を超えない範囲だけ読む。
	// @RequestBody byte[] だと、全部読み込んでから大きさを調べることになり、巨大な本文でメモリを使い切るおそれがある
	private byte[] readLimited(HttpServletRequest request) throws IOException {
		// 1. 送られてくる大きさの申告（Content-Length）が上限を超えていれば、本文を読まずに断る
		if (request.getContentLengthLong() > BackgroundImageService.MAX_BYTES) {
			throw tooLarge();
		}
		// 2. 大きさを申告しない送り方（分割送信）や、申告が嘘のときのために、上限より1バイト多くまで読んで、やめる
		byte[] body = request.getInputStream().readNBytes(BackgroundImageService.MAX_BYTES + 1);
		if (body.length > BackgroundImageService.MAX_BYTES) {
			throw tooLarge();
		}
		return body;
	}

	private ResponseStatusException tooLarge() {
		return new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, "画像が大きすぎます（5MBまで）");
	}

}
