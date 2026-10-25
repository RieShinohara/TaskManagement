package com.example.taskmanagement.exception;

// 探しているもの（カード、列、画像など）が見つからないときの例外。画面には 404 として返る（変換は ApiExceptionHandler）
public class NotFoundException extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public NotFoundException(String message) {
		super(message);
	}

}
