package com.example.taskmanagement.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.taskmanagement.dto.BackgroundImageResponse;
import com.example.taskmanagement.entity.UserBackgroundImage;
import com.example.taskmanagement.repository.UserBackgroundImageRepository;

// 自分の背景画像の処理を行う層
@Service
public class BackgroundImageService {

	// 登録できる画像の大きさの上限。画面が、横1920pxのJPEGに縮小してから送るので、ふつうは数百KB
	public static final int MAX_BYTES = 5 * 1024 * 1024;

	private final UserBackgroundImageRepository imageRepository;

	public BackgroundImageService(UserBackgroundImageRepository imageRepository) {
		this.imageRepository = imageRepository;
	}

	@Transactional(readOnly = true)
	public List<BackgroundImageResponse> findAll() {
		return imageRepository.findAllSummaries();
	}

	@Transactional(readOnly = true)
	public UserBackgroundImage find(String slot) {
		checkSlot(slot);
		return imageRepository.findById(slot)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "画像が登録されていません: " + slot));
	}

	// 登録する。すでに登録があれば、置き換える
	@Transactional
	public BackgroundImageResponse save(String slot, byte[] image) {
		checkSlot(slot);
		checkJpeg(image);
		// DBに入れて読み出しても同じ値になるよう、ミリ秒までにそろえる（画面が、この日時を目印に使うため）
		Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);
		UserBackgroundImage saved = imageRepository.findById(slot).map(existing -> {
			existing.replace(image, now);
			return existing;
		}).orElseGet(() -> imageRepository.save(new UserBackgroundImage(slot, image, now)));
		return new BackgroundImageResponse(saved.getSlot(), saved.getUpdatedAt());
	}

	// 登録した画像を消す（標準の画像に戻る）
	@Transactional
	public void delete(String slot) {
		imageRepository.delete(find(slot));
	}

	// 割り当て先は、青空・夕焼け・星空だけ
	private void checkSlot(String slot) {
		if (!UserBackgroundImage.SLOTS.contains(slot)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "割り当て先が見つかりません: " + slot);
		}
	}

	// JPEGの先頭の目印（FF D8 FF）と、大きさの上限を調べる
	private void checkJpeg(byte[] image) {
		if (image == null || image.length < 3 || (image[0] & 0xFF) != 0xFF || (image[1] & 0xFF) != 0xD8
				|| (image[2] & 0xFF) != 0xFF) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "JPEGの画像ではありません");
		}
		if (image.length > MAX_BYTES) {
			throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, "画像が大きすぎます（5MBまで）");
		}
	}

}
