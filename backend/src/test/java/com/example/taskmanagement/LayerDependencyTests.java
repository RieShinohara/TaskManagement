package com.example.taskmanagement;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

// 層の依存の向きのテスト。向きは、controller → service → repository → entity（dto は、controller と service が使う）。
// 逆向きの import（例：Repository が DTO を知っている）が入ると、このテストが失敗する
@AnalyzeClasses(packages = "com.example.taskmanagement", importOptions = ImportOption.DoNotIncludeTests.class)
class LayerDependencyTests {

	// Controller は、DBの形（Entity）や、DBを触る部品（Repository）を直接使わない。Service を通す
	@ArchTest
	static final ArchRule CONTROLLER_DOES_NOT_USE_ENTITY_OR_REPOSITORY = noClasses().that().resideInAPackage("..controller..")
			.should().dependOnClassesThat().resideInAnyPackage("..entity..", "..repository..");

	// Service は、窓口（Controller）を知らない
	@ArchTest
	static final ArchRule SERVICE_DOES_NOT_USE_CONTROLLER = noClasses().that().resideInAPackage("..service..")
			.should().dependOnClassesThat().resideInAPackage("..controller..");

	// Service は、HTTP や web の型（ResponseStatusException、HttpStatus など）を知らない。
	// 「見つからない」などは、業務の例外（exception パッケージ）で表し、HTTP の番号への変換は ApiExceptionHandler が行う
	@ArchTest
	static final ArchRule SERVICE_DOES_NOT_USE_WEB_TYPES = noClasses().that().resideInAPackage("..service..")
			.should().dependOnClassesThat().resideInAnyPackage("org.springframework.web..", "org.springframework.http..");

	// 業務の例外は、ただの例外。どの層も知らない（どの層からも使える）
	@ArchTest
	static final ArchRule EXCEPTION_DOES_NOT_USE_OTHER_LAYERS = noClasses().that().resideInAPackage("..exception..")
			.should().dependOnClassesThat()
			.resideInAnyPackage("..dto..", "..entity..", "..repository..", "..service..", "..controller..");

	// Repository は、DBを触るだけ。画面とのやり取りの形（DTO）や、上の層を知らない
	@ArchTest
	static final ArchRule REPOSITORY_DOES_NOT_USE_UPPER_LAYERS_OR_DTO = noClasses().that().resideInAPackage("..repository..")
			.should().dependOnClassesThat().resideInAnyPackage("..dto..", "..service..", "..controller..");

	// Entity は、いちばん下。ほかの層を知らない
	@ArchTest
	static final ArchRule ENTITY_DOES_NOT_USE_OTHER_LAYERS = noClasses().that().resideInAPackage("..entity..")
			.should().dependOnClassesThat()
			.resideInAnyPackage("..dto..", "..repository..", "..service..", "..controller..");

	// DTO は、DBを触る部品や、上の層を知らない。
	// ただし、Entity を知ることは認めている（from(Entity) の変換と、色・背景の定数。docs/quality-review.md の B4 を参照）
	@ArchTest
	static final ArchRule DTO_DOES_NOT_USE_REPOSITORY_OR_UPPER_LAYERS = noClasses().that().resideInAPackage("..dto..")
			.should().dependOnClassesThat().resideInAnyPackage("..repository..", "..service..", "..controller..");

}
