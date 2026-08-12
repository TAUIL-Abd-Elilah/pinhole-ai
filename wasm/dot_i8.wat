(module
  (memory (export "memory") 1)

  (func $dot_i8 (param $left i32) (param $right i32) (param $length i32) (result i32)
    (local $offset i32)
    (local $vector_end i32)
    (local $vector_sum v128)
    (local $left_vector v128)
    (local $right_vector v128)
    (local $sum i32)

    local.get $length
    i32.const -16
    i32.and
    local.set $vector_end

    block $vectors_done
      loop $vectors
        local.get $offset
        local.get $vector_end
        i32.ge_u
        br_if $vectors_done

        local.get $left
        local.get $offset
        i32.add
        v128.load
        local.set $left_vector

        local.get $right
        local.get $offset
        i32.add
        v128.load
        local.set $right_vector

        local.get $vector_sum
        local.get $left_vector
        local.get $right_vector
        i16x8.extmul_low_i8x16_s
        i32x4.extadd_pairwise_i16x8_s
        local.get $left_vector
        local.get $right_vector
        i16x8.extmul_high_i8x16_s
        i32x4.extadd_pairwise_i16x8_s
        i32x4.add
        i32x4.add
        local.set $vector_sum

        local.get $offset
        i32.const 16
        i32.add
        local.set $offset
        br $vectors
      end
    end

    local.get $vector_sum
    i32x4.extract_lane 0
    local.get $vector_sum
    i32x4.extract_lane 1
    i32.add
    local.get $vector_sum
    i32x4.extract_lane 2
    i32.add
    local.get $vector_sum
    i32x4.extract_lane 3
    i32.add
    local.set $sum

    block $tail_done
      loop $tail
        local.get $offset
        local.get $length
        i32.ge_u
        br_if $tail_done

        local.get $sum
        local.get $left
        local.get $offset
        i32.add
        i32.load8_s
        local.get $right
        local.get $offset
        i32.add
        i32.load8_s
        i32.mul
        i32.add
        local.set $sum

        local.get $offset
        i32.const 1
        i32.add
        local.set $offset
        br $tail
      end
    end

    local.get $sum
  )

  (func (export "dot_batch")
    (param $query i32)
    (param $index i32)
    (param $count i32)
    (param $dimension i32)
    (param $output i32)
    (local $item i32)

    block $done
      loop $next
        local.get $item
        local.get $count
        i32.ge_u
        br_if $done

        local.get $output
        local.get $item
        i32.const 4
        i32.mul
        i32.add
        local.get $query
        local.get $index
        local.get $item
        local.get $dimension
        i32.mul
        i32.add
        local.get $dimension
        call $dot_i8
        i32.store

        local.get $item
        i32.const 1
        i32.add
        local.set $item
        br $next
      end
    end
  )
)
